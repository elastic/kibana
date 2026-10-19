/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  builtinWorkflowInputDefinitions,
  getOrResolveObject,
  mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema,
} from '@kbn/workflows';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF } from '../../skills/action_policy_management_references';
import { ActionPolicyOperationValidationError } from './operations';

const ALERTING_V2_NOTIFICATION_GROUP_REF = `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`;

/** The built-in schema itself, used to confirm a resolved `$ref` actually points at it. */
const ALERTING_V2_NOTIFICATION_GROUP_SCHEMA =
  builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];

/** Root document carrying `kibana.definitions.*`, used to resolve `#/kibana/definitions/...` refs. */
const KIBANA_DEFINITIONS_ROOT = mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema({}) ?? {};

const PAYLOAD_INPUT_NAME = 'payload';

/** Known top-level property names on the `alertingV2NotificationGroup` payload schema. */
const PAYLOAD_TOP_LEVEL_FIELDS = new Set(
  Object.keys(ALERTING_V2_NOTIFICATION_GROUP_SCHEMA?.properties ?? {})
);

type Severity = 'error' | 'warning';
type Source = 'structural' | 'workflow-validation' | 'destination-resolution';

export interface WorkflowDestinationDiagnostic {
  destinationId: string;
  severity: Severity;
  source: Source;
  message: string;
}

export interface ValidateDestinationsResult {
  diagnostics: WorkflowDestinationDiagnostic[];
}

/** Resolves a destination ID against persisted workflows in the space. */
export interface PersistedWorkflowLookup {
  getWorkflow: (
    id: string,
    spaceId: string
  ) => Promise<{ id: string; name?: string; yaml?: string } | null>;
}

export interface ConnectorLookup {
  findConnectorById: (id: string) => Promise<{ id: string; name: string } | null>;
}

export interface AttachmentIndex {
  inMemoryWorkflowIds: ReadonlySet<string>;
  attachmentToWorkflowId: ReadonlyMap<string, string | undefined>;
  inMemoryWorkflowIdToYaml: ReadonlyMap<string, string>;
}

interface ParsedTrigger {
  type?: string;
  inputs?: unknown;
}

const TRIGGER_FIX_SNIPPET =
  `Fix: re-call \`platform.core.generate_workflow\` with this trigger:\n` +
  `triggers:\n` +
  `  - type: manual\n` +
  `    inputs:\n` +
  `      properties:\n` +
  `        payload:\n` +
  `          $ref: '${ALERTING_V2_NOTIFICATION_GROUP_REF}'\n` +
  `Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`;

export interface DestinationValidationConfig {
  blockOnStructuralErrors: boolean;
  spaceId: string;
  persistedWorkflowLookup: PersistedWorkflowLookup;
  connectorLookup: ConnectorLookup;
  attachmentIndex: AttachmentIndex;
  validateWorkflow?: (
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ) => Promise<ValidateWorkflowResponseDto>;
  request?: KibanaRequest;
  logger?: LoggerServiceContract;
}

/**
 * Collects, evaluates, and finalizes destination diagnostics.
 *
 * Resolution methods resolve a destination ID through the priority chain
 * (in-memory attachment → persisted workflow → connector → unknown) and
 * record diagnostics for each failure mode.
 *
 * Validation methods inspect a resolved workflow's YAML for structural
 * suitability (manual trigger, payload `$ref`) and variable-ref correctness.
 *
 * Call {@link finalize} once all destinations have been processed. It throws
 * a single {@link ActionPolicyOperationValidationError} if any diagnostic has
 * `severity: 'error'`; otherwise it returns the collected warnings.
 */
export class DestinationValidator {
  private readonly diagnostics: WorkflowDestinationDiagnostic[] = [];
  private readonly config: DestinationValidationConfig;

  constructor(config: DestinationValidationConfig) {
    this.config = config;
  }

  private push(destinationId: string, severity: Severity, source: Source, message: string): void {
    this.diagnostics.push({ destinationId, severity, source, message });
  }

  // ---------------------------------------------------------------------------
  // Destination resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolves a destination against in-memory workflow attachments.
   * If the ID matches a workflow attachment by its attachment ID (not its
   * workflowId), records an error and returns `true` (handled).
   * If the ID matches a workflowId, validates the YAML and returns `true`.
   * Returns `false` when the destination is not found in memory.
   */
  async resolveFromAttachments(destinationId: string): Promise<boolean> {
    const { inMemoryWorkflowIds, attachmentToWorkflowId, inMemoryWorkflowIdToYaml } =
      this.config.attachmentIndex;

    if (inMemoryWorkflowIds.has(destinationId)) {
      const yaml = inMemoryWorkflowIdToYaml.get(destinationId);
      if (yaml) {
        await this.validateWorkflow(destinationId, yaml);
      }
      return true;
    }

    if (attachmentToWorkflowId.has(destinationId)) {
      this.attachmentIdMisuse(destinationId, attachmentToWorkflowId.get(destinationId));
      return true;
    }

    return false;
  }

  /**
   * Resolves a destination against persisted workflows in the space.
   * If found, validates the YAML and returns `true`.
   * Returns `false` when the workflow is not persisted.
   */
  async resolveFromPersistedWorkflow(destinationId: string): Promise<boolean> {
    const workflow = await this.config.persistedWorkflowLookup.getWorkflow(
      destinationId,
      this.config.spaceId
    );
    if (!workflow) return false;

    if (workflow.yaml) {
      await this.validateWorkflow(destinationId, workflow.yaml);
    }
    return true;
  }

  /**
   * Checks whether the destination ID is actually a connector.
   * Records an error and returns `true` if it is.
   * Returns `false` when the ID is not a connector.
   */
  async resolveFromConnector(destinationId: string): Promise<boolean> {
    const connector = await this.config.connectorLookup.findConnectorById(destinationId);
    if (!connector) return false;

    this.connectorIdUsed(destinationId, connector.name);
    return true;
  }

  /**
   * Resolves a single destination through the full priority chain:
   * in-memory attachment → persisted workflow → connector → unknown.
   */
  async resolveDestination(destinationId: string): Promise<void> {
    if (await this.resolveFromAttachments(destinationId)) return;
    if (await this.resolveFromPersistedWorkflow(destinationId)) return;
    if (await this.resolveFromConnector(destinationId)) return;
    this.unknownDestination(destinationId);
  }

  // ---------------------------------------------------------------------------
  // Destination-resolution errors (always severity: 'error')
  // ---------------------------------------------------------------------------

  /** The agent used the workflow attachment's own ID instead of the workflowId it was given. */
  attachmentIdMisuse(destinationId: string, correctWorkflowId: string | undefined): void {
    const hint = correctWorkflowId
      ? ` The correct workflow ID for this attachment is "${correctWorkflowId}".`
      : ` This workflow attachment has no workflowId — pass a \`workflowId\` when calling \`platform.core.generate_workflow\`.`;
    this.push(
      destinationId,
      'error',
      'destination-resolution',
      `Destination ID "${destinationId}" is a workflow attachment ID, not a workflow ID. ` +
        `Use the \`workflowId\` you passed to \`platform.core.generate_workflow\` instead of the \`attachmentId\`.` +
        hint
    );
  }

  /** The agent used a connector ID where a workflow ID was expected. */
  connectorIdUsed(destinationId: string, connectorName: string): void {
    this.push(
      destinationId,
      'error',
      'destination-resolution',
      `Destination ID "${destinationId}" is a connector ("${connectorName}"), not a workflow. ` +
        `Action policy destinations must reference workflow IDs. ` +
        `To fix this: create a workflow that uses this connector via the \`platform.core.generate_workflow\` ` +
        `tool (passing a \`workflowId\`), then use that \`workflowId\` as the destination.`
    );
  }

  /** The destination ID did not match any workflow, attachment, or connector. */
  unknownDestination(destinationId: string): void {
    this.push(
      destinationId,
      'error',
      'destination-resolution',
      `Destination ID "${destinationId}" is not a valid workflow in this space or conversation. ` +
        `Each destination must reference either a persisted workflow ID from this Kibana space, ` +
        `or a \`workflowId\` passed to the \`platform.core.generate_workflow\` tool. ` +
        `To create a workflow, call \`platform.core.generate_workflow\` first (passing a \`workflowId\`), ` +
        `then use that \`workflowId\` as the destination.`
    );
  }

  // ---------------------------------------------------------------------------
  // Workflow validation
  // ---------------------------------------------------------------------------

  /** Validates that the parsed triggers contain a `type: manual` entry; returns it when found. */
  validateManualTrigger(
    destinationId: string,
    triggers: ParsedTrigger[] | undefined
  ): ParsedTrigger | undefined {
    const manualTrigger = triggers?.find((t) => t.type === 'manual');
    if (!manualTrigger) {
      this.push(
        destinationId,
        this.config.blockOnStructuralErrors ? 'error' : 'warning',
        'structural',
        `Workflow "${destinationId}" does not have a "manual" trigger. ${TRIGGER_FIX_SNIPPET}`
      );
      return undefined;
    }
    return manualTrigger;
  }

  /** Validates that the manual trigger's `inputs.payload` resolves to `alertingV2NotificationGroup`. */
  validatePayloadRef(destinationId: string, manualTrigger: ParsedTrigger): void {
    if (!manualTriggerDeclaresPayloadInputRef(manualTrigger)) {
      this.push(
        destinationId,
        this.config.blockOnStructuralErrors ? 'error' : 'warning',
        'structural',
        `Workflow "${destinationId}" does not declare \`inputs.payload\` with ` +
          `\`$ref: '${ALERTING_V2_NOTIFICATION_GROUP_REF}'\` on its manual trigger. ` +
          TRIGGER_FIX_SNIPPET
      );
    }
  }

  /** Validates variable refs and Liquid syntax via the workflow validation service. */
  async validateWorkflowRefs(destinationId: string, yaml: string): Promise<void> {
    const { validateWorkflow, request, spaceId, logger } = this.config;
    if (!validateWorkflow || !request) return;

    try {
      const result = await validateWorkflow(yaml, spaceId, request);
      for (const diagnostic of result.diagnostics) {
        if (diagnostic.severity !== 'error') continue;
        this.push(
          destinationId,
          'warning',
          'workflow-validation',
          `[${diagnostic.ruleId}] ${diagnostic.message}${
            diagnostic.path ? ` (at ${diagnostic.path.join('.')})` : ''
          }`
        );
      }
    } catch (error) {
      logger?.warn({
        message: `Workflow validation service call failed for destination "${destinationId}"`,
        code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_WORKFLOW_VALIDATION_FAILED,
        labels: { space_id: spaceId },
        error,
      });
    }
  }

  /**
   * Validates that the manual trigger declares only the `payload` input.
   * Action-policy dispatch populates `inputs.payload` and nothing else, so any
   * other declared input is never filled and any other `required` entry makes
   * the dispatch fail input validation.
   */
  validateManualTriggerInputs(destinationId: string, manualTrigger: ParsedTrigger): void {
    const { properties, required } = (manualTrigger.inputs ?? {}) as {
      properties?: unknown;
      required?: unknown;
    };
    const extraProperties =
      properties && typeof properties === 'object' && !Array.isArray(properties)
        ? Object.keys(properties).filter((key) => key !== PAYLOAD_INPUT_NAME)
        : [];
    const extraRequired = Array.isArray(required)
      ? required.filter((entry) => entry !== PAYLOAD_INPUT_NAME).map(String)
      : [];
    if (extraProperties.length === 0 && extraRequired.length === 0) return;

    const problems: string[] = [];
    if (extraProperties.length > 0) {
      problems.push(
        `  - unexpected input properties: ${formatCodeList(extraProperties)} ` +
          `(only \`payload\` is allowed; read alert data from \`inputs.payload.alerts\` and ` +
          `rule data from \`inputs.payload.rules[alert.rule_id]\`)`
      );
    }
    if (extraRequired.length > 0) {
      problems.push(
        `  - unexpected \`required\` entries: ${formatCodeList(extraRequired)} ` +
          `(only \`payload\` may be required)`
      );
    }

    this.push(
      destinationId,
      this.config.blockOnStructuralErrors ? 'error' : 'warning',
      'structural',
      `Workflow "${destinationId}" declares manual-trigger inputs other than \`payload\`. ` +
        `Action policy dispatch only provides \`inputs.payload\`:\n` +
        `${problems.join('\n')}\n` +
        TRIGGER_FIX_SNIPPET
    );
  }

  /**
   * Rejects trigger types other than `manual` (and `alert`, which
   * {@link validateNoAlertTrigger} reports with its own guidance), as well as
   * duplicate manual triggers. Those triggers fire without the dispatch
   * payload, so every `inputs.payload.*` template renders empty.
   */
  validateNoExtraTriggers(
    destinationId: string,
    triggers: ParsedTrigger[],
    manualTrigger: ParsedTrigger
  ): void {
    const extraTypes = triggers
      .filter((trigger) => trigger !== manualTrigger && trigger.type !== 'alert')
      .map((trigger) => String(trigger.type ?? 'unknown'));
    if (extraTypes.length === 0) return;

    this.push(
      destinationId,
      this.config.blockOnStructuralErrors ? 'error' : 'warning',
      'structural',
      `Workflow "${destinationId}" declares triggers other than the single manual trigger: ` +
        `${formatCodeList(extraTypes.map((type) => `type: ${type}`))}. ` +
        `Action policy destinations are dispatched via the manual trigger only — other ` +
        `triggers run without \`inputs.payload\`, so payload templates render empty. ` +
        `Remove them. ` +
        TRIGGER_FIX_SNIPPET
    );
  }

  // ---------------------------------------------------------------------------
  // Common template mistakes
  // ---------------------------------------------------------------------------

  /**
   * Rejects workflows that declare a `type: alert` trigger alongside the
   * required manual trigger. Action-policy dispatch uses the manual trigger;
   * an alert trigger introduces an `event` variable that shadows
   * `inputs.payload` and leads models to generate templates that read
   * `event.*` instead of the dispatch payload.
   */
  validateNoAlertTrigger(destinationId: string, triggers: ParsedTrigger[]): void {
    if (triggers.some((t) => t.type === 'alert')) {
      this.push(
        destinationId,
        this.config.blockOnStructuralErrors ? 'error' : 'warning',
        'structural',
        `Workflow "${destinationId}" declares a "type: alert" trigger alongside the manual ` +
          `trigger. Action policy destinations are dispatched via the manual trigger only — ` +
          `the alert trigger will not fire and introduces an \`event\` variable that does not ` +
          `exist at dispatch time. ` +
          `Fix: re-call \`platform.core.generate_workflow\` and remove the \`type: alert\` ` +
          `trigger, keeping only the \`type: manual\` trigger with the payload \`$ref\`. ` +
          `Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`
      );
    }
  }

  /**
   * Checks that the workflow's step templates actually reference
   * `inputs.payload`. A workflow that declares the `$ref` but never reads
   * from the payload will produce empty or placeholder content when dispatched.
   *
   * Skipped when the YAML contains no Liquid expressions at all (the
   * workflow may still be under construction or have no steps yet).
   */
  validatePayloadLiquidPresence(destinationId: string, yaml: string): void {
    if (!/\{\{|\{%/.test(yaml)) return;
    if (!/inputs\.payload/.test(yaml)) {
      this.push(
        destinationId,
        this.config.blockOnStructuralErrors ? 'error' : 'warning',
        'structural',
        `Workflow "${destinationId}" declares the payload \`$ref\` but its templates never ` +
          `reference \`inputs.payload\`. The workflow must use \`inputs.payload.alerts\`, ` +
          `\`inputs.payload.rules[alert.rule_id].name\`, and other payload fields to render ` +
          `alert data. ` +
          `Fix: re-call \`platform.core.generate_workflow\` and use \`inputs.payload.*\` ` +
          `in the template body. ` +
          `Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`
      );
    }
  }

  /**
   * Validates that `inputs.payload.*` references use known top-level fields
   * from the `alertingV2NotificationGroup` schema. Catches common mistakes
   * like `inputs.payload.rule.name` (should be `inputs.payload.rules[...]`)
   * and `inputs.payload.spaceId` (per-alert field, not on the payload root).
   */
  validatePayloadFieldPaths(destinationId: string, yaml: string): void {
    const invalid = collectInvalidPayloadSegments(yaml);
    if (invalid.size === 0) return;

    const validFields = [...PAYLOAD_TOP_LEVEL_FIELDS]
      .sort()
      .map((f) => `\`${f}\``)
      .join(', ');
    const wrongFields = [...invalid]
      .sort()
      .map((f) => `\`inputs.payload.${f}\``)
      .join(', ');

    this.push(
      destinationId,
      this.config.blockOnStructuralErrors ? 'error' : 'warning',
      'structural',
      `Workflow "${destinationId}" references payload fields that do not exist: ${wrongFields}. ` +
        `The top-level fields on the notification-group payload are: ${validFields}. ` +
        `Common corrections:\n` +
        `  - \`inputs.payload.rule.name\` → \`inputs.payload.rules[alert.rule_id].name\`\n` +
        `  - \`inputs.payload.ruleName\` → \`inputs.payload.rules[alert.rule_id].name\`\n` +
        `  - \`inputs.payload.spaceId\` → per-alert field \`alert.space_id\`\n` +
        `Fix: re-call \`platform.core.generate_workflow\` with the correct field paths. ` +
        `Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`
    );
  }

  /** Runs all workflow checks: manual trigger → payload `$ref` → common mistakes → validation service. */
  async validateWorkflow(destinationId: string, yaml: string): Promise<void> {
    const triggers = parseWorkflowTriggers(yaml);
    const manualTrigger = this.validateManualTrigger(destinationId, triggers);
    if (!manualTrigger) return;

    this.validatePayloadRef(destinationId, manualTrigger);
    this.validateManualTriggerInputs(destinationId, manualTrigger);
    this.validateNoExtraTriggers(destinationId, triggers!, manualTrigger);
    this.validateNoAlertTrigger(destinationId, triggers!);
    this.validatePayloadLiquidPresence(destinationId, yaml);
    this.validatePayloadFieldPaths(destinationId, yaml);
    await this.validateWorkflowRefs(destinationId, yaml);
  }

  // ---------------------------------------------------------------------------
  // Finalization
  // ---------------------------------------------------------------------------

  /**
   * If any diagnostic has `severity: 'error'`, throws a single
   * {@link ActionPolicyOperationValidationError} containing every diagnostic
   * (errors and warnings together). Otherwise returns the warnings.
   */
  finalize(): ValidateDestinationsResult {
    const errors = this.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      const warnings = this.diagnostics.filter((d) => d.severity === 'warning');
      const errorCount = errors.length === 1 ? '1 error' : `${errors.length} errors`;
      const warningCount =
        warnings.length === 0
          ? ''
          : warnings.length === 1
          ? ', 1 warning'
          : `, ${warnings.length} warnings`;
      const header = `Destination validation failed (${errorCount}${warningCount}):`;
      const formatted = this.diagnostics.map((d, i) => `[${i + 1}] [${d.severity}] ${d.message}`);
      throw new ActionPolicyOperationValidationError(`${header}\n\n${formatted.join('\n\n')}`);
    }

    return { diagnostics: this.diagnostics };
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function formatCodeList(values: string[]): string {
  return values.map((value) => `\`${value}\``).join(', ');
}

function parseWorkflowTriggers(yaml: string): ParsedTrigger[] | undefined {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success) return undefined;
  const triggers = (parsed.json as { triggers?: unknown } | undefined)?.triggers;
  if (!Array.isArray(triggers)) return undefined;
  return triggers as ParsedTrigger[];
}

function manualTriggerDeclaresPayloadInputRef(manualTrigger: ParsedTrigger): boolean {
  const inputs = manualTrigger.inputs as { properties?: Record<string, unknown> } | undefined;
  const payload = inputs?.properties?.payload;
  if (!payload) return false;
  const resolved = getOrResolveObject(payload, KIBANA_DEFINITIONS_ROOT);
  return resolved === ALERTING_V2_NOTIFICATION_GROUP_SCHEMA;
}

/**
 * Returns the set of first path segments after `inputs.payload.` that are
 * not in the `alertingV2NotificationGroup` schema's top-level properties.
 *
 * Scans the raw YAML string so it catches paths inside Liquid filters
 * (e.g. `{{ inputs.payload.rule.name | default: 'Unknown' }}`) that the
 * workflow validator's `VARIABLE_REGEX` skips because the colon is not in
 * its character class.
 */
function collectInvalidPayloadSegments(yaml: string): Set<string> {
  const re = /inputs\.payload\.(\w+)/g;
  const invalid = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(yaml)) !== null) {
    if (!PAYLOAD_TOP_LEVEL_FIELDS.has(match[1])) {
      invalid.add(match[1]);
    }
  }
  return invalid;
}
