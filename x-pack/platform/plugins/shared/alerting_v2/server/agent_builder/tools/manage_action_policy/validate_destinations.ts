/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  builtinWorkflowInputDefinitions,
  getOrResolveObject,
  mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema,
} from '@kbn/workflows';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { ActionPolicyOperationValidationError } from './operations';

const ALERTING_V2_NOTIFICATION_GROUP_REF = `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`;

/** The built-in schema itself, used to confirm a resolved `$ref` actually points at it. */
const ALERTING_V2_NOTIFICATION_GROUP_SCHEMA =
  builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];

/** Root document carrying `kibana.definitions.*`, used to resolve `#/kibana/definitions/...` refs. */
const KIBANA_DEFINITIONS_ROOT = mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema({}) ?? {};

interface ParsedTrigger {
  type?: string;
  inputs?: unknown;
}

/** Resolves a destination ID against persisted workflows (saved objects in the space), as opposed to in-memory workflow-YAML attachments in the conversation. */
export interface PersistedWorkflowLookup {
  getWorkflow: (
    id: string,
    spaceId: string
  ) => Promise<{
    id: string;
    name?: string;
    yaml?: string;
  } | null>;
}

export interface ConnectorLookup {
  findConnectorById: (id: string) => Promise<{ id: string; name: string } | null>;
}

export interface ValidateDestinationsDeps {
  attachments: AttachmentStateManager;
  persistedWorkflowLookup: PersistedWorkflowLookup;
  connectorLookup: ConnectorLookup;
  spaceId: string;
  /**
   * Runs a workflow's YAML through the workflows validation service (schema,
   * variable refs, Liquid syntax). Optional so tests and callers that don't
   * have this wired can still validate destination IDs and structural shape.
   */
  validateWorkflow?: (
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ) => Promise<ValidateWorkflowResponseDto>;
  request?: KibanaRequest;
  /** Used to make workflow-validation-service failures observable; optional for tests. */
  logger?: LoggerServiceContract;
  /**
   * Whether a destination workflow missing a `manual` trigger should hard-block
   * (new policies, or edits that introduce/change the destinations via
   * `set_destinations`) or only surface a non-blocking warning (edits that
   * leave an already-persisted, already-invalid destination untouched — see
   * #277569). Defaults to `true`.
   */
  blockOnMissingManualTrigger?: boolean;
}

export interface WorkflowDestinationDiagnostic {
  destinationId: string;
  severity: 'warning';
  source: 'structural' | 'workflow-validation';
  message: string;
}

export interface ValidateDestinationsResult {
  diagnostics: WorkflowDestinationDiagnostic[];
}

function findManualTrigger(yaml: string): ParsedTrigger | undefined {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success) {
    return undefined;
  }
  const triggers = (parsed.json as { triggers?: unknown } | undefined)?.triggers;
  if (!Array.isArray(triggers)) {
    return undefined;
  }
  return (triggers as ParsedTrigger[]).find((trigger) => trigger.type === 'manual');
}

/**
 * Checks that the manual trigger's `inputs.payload` actually resolves — via
 * the workflows package's own `$ref` resolution — to the built-in
 * `alertingV2NotificationGroup` schema. A `payload` key alone, or a `$ref`
 * that merely looks right but doesn't resolve (typo, wrong prefix, points at
 * something else), is not enough: without a resolved match, the variable-ref
 * validator has no schema to check `{{ inputs.payload.* }}` Liquid
 * expressions against, so typos like `episodez` would go undetected.
 */
function manualTriggerDeclaresPayloadInputRef(manualTrigger: ParsedTrigger): boolean {
  const inputs = manualTrigger.inputs as { properties?: Record<string, unknown> } | undefined;
  const payload = inputs?.properties?.payload;
  if (!payload) return false;
  const resolved = getOrResolveObject(payload, KIBANA_DEFINITIONS_ROOT);
  return resolved === ALERTING_V2_NOTIFICATION_GROUP_SCHEMA;
}

/**
 * Checks a destination workflow's structural suitability for action policy
 * dispatch (manual trigger, `inputs.payload` declaration) and, when
 * `validateWorkflow` is wired, runs its YAML through the workflows validation
 * service to surface variable-ref and Liquid errors as diagnostics.
 *
 * A missing manual trigger hard-blocks only when `blockOnMissingManualTrigger`
 * is set (new policies, or edits that introduce/change this destination) —
 * otherwise it's a non-blocking warning, same as everything else here, so
 * editing an unrelated field (e.g. renaming the policy) doesn't fail just
 * because an already-persisted destination predates this validation.
 */
async function collectWorkflowDiagnostics(
  destinationId: string,
  yaml: string,
  {
    validateWorkflow,
    request,
    spaceId,
    logger,
    blockOnMissingManualTrigger,
  }: Pick<
    ValidateDestinationsDeps,
    'validateWorkflow' | 'request' | 'spaceId' | 'logger' | 'blockOnMissingManualTrigger'
  >
): Promise<WorkflowDestinationDiagnostic[]> {
  const manualTrigger = findManualTrigger(yaml);
  const diagnostics: WorkflowDestinationDiagnostic[] = [];

  if (!manualTrigger) {
    const missingManualTriggerMessage =
      `Destination workflow "${destinationId}" does not have a "manual" trigger. ` +
      `Action policy destinations must declare \`triggers: - type: manual\` to receive dispatches`;

    if (blockOnMissingManualTrigger ?? true) {
      throw new ActionPolicyOperationValidationError(`${missingManualTriggerMessage}.`);
    }
    diagnostics.push({
      destinationId,
      severity: 'warning',
      source: 'structural',
      message: `${missingManualTriggerMessage} — regenerate this workflow or update its destination.`,
    });
    return diagnostics;
  }

  if (!manualTriggerDeclaresPayloadInputRef(manualTrigger)) {
    diagnostics.push({
      destinationId,
      severity: 'warning',
      source: 'structural',
      message:
        `Destination workflow "${destinationId}" does not declare \`inputs.payload\` with ` +
        `\`$ref: '${ALERTING_V2_NOTIFICATION_GROUP_REF}'\` on its manual trigger. ` +
        `Liquid variables like {{ inputs.payload.episodes }} will not be statically validated against the dispatch payload shape.`,
    });
  }

  if (validateWorkflow && request) {
    try {
      const result = await validateWorkflow(yaml, spaceId, request);
      for (const diagnostic of result.diagnostics) {
        if (diagnostic.severity !== 'error') continue;
        diagnostics.push({
          destinationId,
          severity: 'warning',
          source: 'workflow-validation',
          message: `[${diagnostic.ruleId}] ${diagnostic.message}${
            diagnostic.path ? ` (at ${diagnostic.path.join('.')})` : ''
          }`,
        });
      }
    } catch (error) {
      // Best-effort: the workflow validation service being unavailable should
      // not block composing the action policy, but the failure is still
      // worth surfacing for debugging.
      logger?.warn({
        message: `Workflow validation service call failed for destination "${destinationId}"`,
        code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_WORKFLOW_VALIDATION_FAILED,
        labels: { space_id: spaceId },
        error,
      });
    }
  }

  return diagnostics;
}

/**
 * Validates that every destination references a valid workflow, and that
 * each resolved workflow is structurally suitable for action policy dispatch.
 *
 * Throws {@link ActionPolicyOperationValidationError} for invalid destinations
 * (bare attachment IDs, connector IDs, unknown IDs, or — when
 * `deps.blockOnMissingManualTrigger` is set — a workflow missing a manual
 * trigger). Returns non-blocking diagnostics for variable-ref issues, missing
 * `inputs.payload` declarations, and a missing manual trigger on edits that
 * don't introduce/change the destination.
 */
export async function validateDestinations(
  destinations: ActionPolicyDestination[],
  deps: ValidateDestinationsDeps
): Promise<ValidateDestinationsResult> {
  const { attachments, persistedWorkflowLookup, connectorLookup, spaceId } = deps;
  const activeAttachments = attachments.getActive();

  // Workflows generated in this conversation (workflow-YAML attachments), not yet
  // persisted — as opposed to `persistedWorkflowLookup`, which resolves saved objects.
  const inMemoryWorkflowIds = new Set<string>();
  const attachmentToWorkflowId = new Map<string, string | undefined>();
  const inMemoryWorkflowIdToYaml = new Map<string, string>();

  for (const att of activeAttachments) {
    if (att.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) continue;
    const latestVersion = att.versions.at(-1);
    const data = latestVersion?.data as { workflowId?: string; yaml?: string } | undefined;
    if (data?.workflowId) {
      inMemoryWorkflowIds.add(data.workflowId);
      if (data.yaml) {
        inMemoryWorkflowIdToYaml.set(data.workflowId, data.yaml);
      }
    }
    attachmentToWorkflowId.set(att.id, data?.workflowId);
  }

  const diagnostics: WorkflowDestinationDiagnostic[] = [];
  const collectDiagnosticsIfYaml = async (destinationId: string, yaml: string | undefined) => {
    if (yaml) {
      diagnostics.push(...(await collectWorkflowDiagnostics(destinationId, yaml, deps)));
    }
  };

  for (const dest of destinations) {
    if (inMemoryWorkflowIds.has(dest.id)) {
      await collectDiagnosticsIfYaml(dest.id, inMemoryWorkflowIdToYaml.get(dest.id));
      continue;
    }

    if (attachmentToWorkflowId.has(dest.id)) {
      const correctId = attachmentToWorkflowId.get(dest.id);
      const hint = correctId
        ? ` The correct workflow ID for this attachment is "${correctId}".`
        : ` This workflow attachment has no workflowId — pass a \`workflowId\` when calling \`platform.core.generate_workflow\`.`;
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a workflow attachment ID, not a workflow ID. ` +
          `Use the \`workflowId\` you passed to \`platform.core.generate_workflow\` instead of the \`attachmentId\`.` +
          hint
      );
    }

    const workflow = await persistedWorkflowLookup.getWorkflow(dest.id, spaceId);
    if (workflow) {
      await collectDiagnosticsIfYaml(dest.id, workflow.yaml);
      continue;
    }

    const connector = await connectorLookup.findConnectorById(dest.id);
    if (connector) {
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a connector ("${connector.name}"), not a workflow. ` +
          `Action policy destinations must reference workflow IDs. ` +
          `To fix this: create a workflow that uses this connector via the \`platform.core.generate_workflow\` ` +
          `tool (passing a \`workflowId\`), then use that \`workflowId\` as the destination.`
      );
    }

    throw new ActionPolicyOperationValidationError(
      `Destination ID "${dest.id}" is not a valid workflow in this space or conversation. ` +
        `Each destination must reference either a persisted workflow ID from this Kibana space, ` +
        `or a \`workflowId\` passed to the \`platform.core.generate_workflow\` tool. ` +
        `To create a workflow, call \`platform.core.generate_workflow\` first (passing a \`workflowId\`), ` +
        `then use that \`workflowId\` as the destination.`
    );
  }

  return { diagnostics };
}
