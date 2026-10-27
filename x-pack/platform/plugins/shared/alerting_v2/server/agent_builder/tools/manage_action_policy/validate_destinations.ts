/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type {
  TypedAttachmentClient,
  WorkflowYamlAttachmentData,
} from '../../../lib/services/attachments_service';
import {
  DestinationValidator,
  type PersistedWorkflowLookup,
  type ConnectorLookup,
} from './destination_diagnostics';

export type {
  WorkflowDestinationDiagnostic,
  ValidateDestinationsResult,
  PersistedWorkflowLookup,
  ConnectorLookup,
} from './destination_diagnostics';

export interface ValidateDestinationsDeps {
  workflowAttachments: TypedAttachmentClient<WorkflowYamlAttachmentData>;
  persistedWorkflowLookup: PersistedWorkflowLookup;
  connectorLookup: ConnectorLookup;
  spaceId: string;
  validateWorkflow?: (
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ) => Promise<ValidateWorkflowResponseDto>;
  request?: KibanaRequest;
  logger?: LoggerServiceContract;
  /**
   * Whether structural validation errors (missing manual trigger, wrong or
   * missing payload `$ref`, alert-trigger alongside manual, invalid payload
   * field paths) should hard-block (new policies or edits that
   * introduce/change destinations via `set_destinations`) or surface as
   * non-blocking warnings (edits that leave an already-persisted, invalid
   * destination untouched — see #277569). Defaults to `true`.
   */
  blockOnStructuralErrors?: boolean;
}

/**
 * Validates that every destination references a valid workflow, and that
 * each resolved workflow is structurally suitable for action policy dispatch.
 *
 * Delegates all resolution, validation, and error formatting to
 * {@link DestinationValidator}. Throws when any diagnostic is an error;
 * returns warnings otherwise.
 */
export async function validateDestinations(
  destinations: ActionPolicyDestination[],
  deps: ValidateDestinationsDeps
) {
  const {
    workflowAttachments,
    persistedWorkflowLookup,
    connectorLookup,
    spaceId,
    validateWorkflow,
    request,
    logger,
    blockOnStructuralErrors,
  } = deps;

  const validator = new DestinationValidator({
    blockOnStructuralErrors: blockOnStructuralErrors ?? true,
    spaceId,
    persistedWorkflowLookup,
    connectorLookup,
    attachmentIndex: buildAttachmentIndex(workflowAttachments),
    validateWorkflow,
    request,
    logger,
  });

  for (const dest of destinations) {
    await validator.resolveDestination(dest.id);
  }

  return validator.finalize();
}

/** Indexes workflow attachments by workflowId and attachment ID for fast lookup. */
function buildAttachmentIndex(
  workflowAttachments: TypedAttachmentClient<WorkflowYamlAttachmentData>
) {
  const inMemoryWorkflowIds = new Set<string>();
  const attachmentToWorkflowId = new Map<string, string | undefined>();
  const inMemoryWorkflowIdToYaml = new Map<string, string>();

  for (const { id, data } of workflowAttachments.list()) {
    const workflowId = typeof data.workflowId === 'string' ? data.workflowId : undefined;
    const yaml = typeof data.yaml === 'string' ? data.yaml : undefined;
    if (workflowId) {
      inMemoryWorkflowIds.add(workflowId);
      if (yaml) {
        inMemoryWorkflowIdToYaml.set(workflowId, yaml);
      }
    }
    attachmentToWorkflowId.set(id, workflowId);
  }

  return { inMemoryWorkflowIds, attachmentToWorkflowId, inMemoryWorkflowIdToYaml };
}
