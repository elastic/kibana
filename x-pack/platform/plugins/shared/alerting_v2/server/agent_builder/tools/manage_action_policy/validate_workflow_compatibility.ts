/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
  parseJsPropertyAccess,
  scanForTemplateVariables,
  WorkflowSchemaForAutocomplete,
  type JsonSchema,
} from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { parse as parseYaml } from 'yaml';

const PAYLOAD_PREFIX = 'inputs.payload';
const MANUAL_TRIGGER_TYPE = 'manual';

/**
 * The lenient workflow shape, it describes the document's structure
 * without rejecting connector-specific step configuration the way
 * the strict `WorkflowSchema` would.
 */
type ParsedWorkflow = z.output<typeof WorkflowSchemaForAutocomplete>;

export type WorkflowCompatibilityDiagnosticCode =
  | 'invalid_yaml'
  | 'not_a_workflow'
  | 'invalid_liquid'
  | 'no_payload_reference'
  | 'unknown_payload_field'
  | 'unexpected_trigger'
  | 'disabled';

export interface WorkflowCompatibilityDiagnostic {
  code: WorkflowCompatibilityDiagnosticCode;
  /**
   * `error` marks a workflow that cannot deliver the notification at all.
   * `warning` marks a workflow that dispatch can still reach but that likely
   * does not do what the user asked for.
   */
  severity: 'error' | 'warning';
  message: string;
}

const asError = (
  code: WorkflowCompatibilityDiagnosticCode,
  message: string
): WorkflowCompatibilityDiagnostic => ({ code, severity: 'error', message });

const asWarning = (
  code: WorkflowCompatibilityDiagnosticCode,
  message: string
): WorkflowCompatibilityDiagnostic => ({ code, severity: 'warning', message });

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getPayloadSchema = (): JsonSchema => {
  const schema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];
  if (!schema) {
    throw new Error(
      `Missing built-in workflow input definition "${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}"`
    );
  }
  return schema;
};

const isUnderPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);

const ANY_KEY_OBJECT: JsonSchema = { type: 'object', additionalProperties: true };

/**
 * Follows one path segment into `schema` and returns the schema of the value it lands
 * on, or `null` when the schema doesn't allow that segment.
 */
const resolveSegment = (schema: JsonSchema, segment: string): JsonSchema | null => {
  if (schema.type === 'array') {
    // Liquid indexes arrays numerically and can't pick a slot out of a tuple schema.
    const items = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    return /^\d+$/.test(segment) ? items ?? ANY_KEY_OBJECT : null;
  }

  if (schema.type !== 'object') {
    return null;
  }

  // Open maps (groupKey, rules, episode data) accept any key but don't describe their
  // values, so everything below them is unconstrained.
  return schema.properties?.[segment] ?? (schema.additionalProperties ? ANY_KEY_OBJECT : null);
};

const toPayloadRelativePath = (path: string): string => {
  if (path === PAYLOAD_PREFIX) {
    return '';
  }
  if (path.startsWith(`${PAYLOAD_PREFIX}.`)) {
    return path.slice(PAYLOAD_PREFIX.length + 1);
  }
  return path.slice(PAYLOAD_PREFIX.length); // inputs.payload[...]
};

export const isActionPolicyPayloadLiquidPath = (path: string): boolean =>
  isUnderPrefix(path, PAYLOAD_PREFIX);

/**
 * Walks `relativePath` (everything after `inputs.payload`) against the
 * alertingV2NotificationGroup JSON Schema. An empty path is the payload root, which is
 * always valid.
 */
export const isActionPolicyPayloadPathInSchema = (
  relativePath: string,
  schema: JsonSchema = getPayloadSchema()
): boolean => {
  let current: JsonSchema | null = schema;

  for (const segment of parseJsPropertyAccess(relativePath)) {
    current = resolveSegment(current, segment);
    if (!current) {
      return false;
    }
  }

  return true;
};

const missingPayloadReferenceDiagnostic = (variables: string[]): WorkflowCompatibilityDiagnostic =>
  asError(
    'no_payload_reference',
    `Generated workflow Liquid does not reference \`inputs.payload.*\`. ` +
      `Action-policy dispatch exposes alert data as \`inputs.payload\` ` +
      `(mirrors \`ActionPolicyWorkflowPayload\`). ` +
      `Found variables: ${
        variables.length > 0 ? variables.map((path) => `\`${path}\``).join(', ') : '(none)'
      }.`
  );

const unknownPayloadFieldsDiagnostic = (
  invalidPayloadPaths: string[],
  payloadSchema: JsonSchema
): WorkflowCompatibilityDiagnostic =>
  asError(
    'unknown_payload_field',
    `Generated workflow Liquid references unknown \`inputs.payload\` fields: ` +
      `${invalidPayloadPaths.map((path) => `\`${path}\``).join(', ')}. ` +
      `Allowed top-level payload fields: ${Object.keys(payloadSchema.properties ?? {}).join(', ')}.`
  );

const unexpectedTriggerDiagnostic = (triggerTypes: string[]): WorkflowCompatibilityDiagnostic =>
  asWarning(
    'unexpected_trigger',
    `Generated workflow declares triggers ${
      triggerTypes.length > 0 ? triggerTypes.map((type) => `\`${type}\``).join(', ') : '(none)'
    }. Action-policy dispatch schedules the workflow directly, so it should declare ` +
      `exactly one \`${MANUAL_TRIGGER_TYPE}\` trigger.`
  );

const disabledWorkflowDiagnostic = (): WorkflowCompatibilityDiagnostic =>
  asWarning(
    'disabled',
    `Generated workflow is disabled. Alerting V2 skips dispatch for disabled workflows, ` +
      `so this policy will not notify until the workflow is enabled.`
  );

const parseWorkflowDocument = (
  parsed: unknown
): { workflow: ParsedWorkflow } | { diagnostic: WorkflowCompatibilityDiagnostic } => {
  const result = WorkflowSchemaForAutocomplete.safeParse(parsed);
  if (!result.success) {
    return {
      diagnostic: asError(
        'not_a_workflow',
        `Generated workflow YAML is not a workflow document: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; ')}`
      ),
    };
  }
  return { workflow: result.data };
};

/**
 * Reports how well a destination workflow matches what Alerting V2 action-policy
 * dispatch actually provides.
 *
 * Generic workflow validity (schema, connectors, graph) is already enforced by the
 * workflows-owned generation and CRUD paths, so this only covers the dispatch
 * contract: the workflow must be a parseable document with valid Liquid that reads
 * its alert data from `inputs.payload`, using fields the
 * `alertingV2NotificationGroup` payload actually carries.
 *
 * Returns an empty array when the workflow is compatible. Callers decide whether a
 * diagnostic blocks the operation — see `manage_action_policy`.
 *
 * @param yaml The workflow YAML, from the conversation attachment or a saved workflow.
 * @param options.enabled `enabled` on the saved workflow, when the destination
 * resolves to one. The YAML's own `enabled` field is checked either way.
 */
export const validateActionPolicyWorkflow = (
  yaml: string,
  { enabled }: { enabled?: boolean } = {}
): WorkflowCompatibilityDiagnostic[] => {
  let parsed: unknown;
  try {
    parsed = parseYaml(yaml);
  } catch (error) {
    return [
      asError('invalid_yaml', `Generated workflow YAML is not valid YAML: ${getErrorMessage(error)}`),
    ];
  }

  const documentResult = parseWorkflowDocument(parsed);
  if ('diagnostic' in documentResult) {
    return [documentResult.diagnostic];
  }
  const { workflow } = documentResult;

  let variables: string[];
  try {
    variables = Array.from(new Set(scanForTemplateVariables(parsed))).sort();
  } catch (error) {
    return [
      asError(
        'invalid_liquid',
        `Generated workflow contains invalid Liquid template syntax: ${getErrorMessage(error)}`
      ),
    ];
  }

  const diagnostics: WorkflowCompatibilityDiagnostic[] = [];
  const payloadSchema = getPayloadSchema();
  const payloadVariables = variables.filter(isActionPolicyPayloadLiquidPath);

  if (payloadVariables.length === 0) {
    diagnostics.push(missingPayloadReferenceDiagnostic(variables));
  } else {
    const invalidPayloadPaths = payloadVariables.filter(
      (path) => !isActionPolicyPayloadPathInSchema(toPayloadRelativePath(path), payloadSchema)
    );
    if (invalidPayloadPaths.length > 0) {
      diagnostics.push(unknownPayloadFieldsDiagnostic(invalidPayloadPaths, payloadSchema));
    }
  }

  const triggerTypes = workflow.triggers.map((trigger) => trigger.type);
  if (triggerTypes.length !== 1 || triggerTypes[0] !== MANUAL_TRIGGER_TYPE) {
    diagnostics.push(unexpectedTriggerDiagnostic(triggerTypes));
  }

  if (enabled === false || workflow.enabled === false) {
    diagnostics.push(disabledWorkflowDiagnostic());
  }

  return diagnostics;
};
