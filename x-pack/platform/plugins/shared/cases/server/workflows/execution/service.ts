/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isPlainObject } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuditLogger, SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  CASE_SAVED_OBJECT,
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
} from '../../../common/constants';
import { CasesWorkflowExecutionMetadataSchema } from '../../../common/types/api/workflow/v1';
import type { RunCaseWorkflowRequest, RunCaseWorkflowResponse } from '../../../common/types/api';
import { AttachmentType } from '../../../common/types/domain';
import type { CasesClient } from '../../client';
import { getCasesClientInternalArgs } from '../../client/client';
import { ensureAuthorizedToRunWorkflow } from '../../client/cases/ensure_authorized_to_run_workflow';
import {
  preflightWorkflowExecution,
  recordWorkflowExecution,
} from '../../client/user_actions/record_workflow_execution';
import type { CasesRequestHandlerContext } from '../../types';
import { buildActivityOrigin } from './build_activity_origin';
import { parseSelectedAlertPairs, validateOrigin } from './validate_origin';

interface RunWorkflowParams {
  workflowId: string;
  body: RunCaseWorkflowRequest;
  request: KibanaRequest;
  context: CasesRequestHandlerContext;
  casesClient: CasesClient;
  spaceId: string;
}

interface CasesWorkflowRunServiceDeps {
  management: WorkflowsServerPluginSetup['management'];
  logger: Logger;
  audit: SecurityPluginSetup['audit'];
}

export class CasesWorkflowRunService {
  private readonly management: WorkflowsServerPluginSetup['management'];
  private readonly logger: Logger;
  private readonly audit: SecurityPluginSetup['audit'];

  constructor({ management, logger, audit }: CasesWorkflowRunServiceDeps) {
    this.management = management;
    this.logger = logger;
    this.audit = audit;
  }

  public async run({
    workflowId,
    body,
    request,
    context,
    casesClient,
    spaceId,
  }: RunWorkflowParams): Promise<RunCaseWorkflowResponse> {
    const { caseIds } = body;
    const auditLogger = this.audit.asScoped(request);

    try {
      return await this.runWorkflow({
        workflowId,
        body,
        request,
        context,
        casesClient,
        spaceId,
        auditLogger,
      });
    } catch (error) {
      this.logWorkflowRunAuditEvents({
        auditLogger,
        caseIds,
        workflowId,
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  private async runWorkflow({
    workflowId,
    body,
    request,
    context,
    casesClient,
    spaceId,
    auditLogger,
  }: RunWorkflowParams & { auditLogger: AuditLogger }): Promise<RunCaseWorkflowResponse> {
    if (!this.management.isWorkflowsAvailable) {
      throw Boom.forbidden('Workflows are not available.');
    }

    const { license } = await context.licensing;
    if (!license.isAvailable || !license.isActive || !license.hasAtLeast('enterprise')) {
      throw Boom.forbidden('Workflows require an active Enterprise license.');
    }

    const { caseIds } = body;

    // Recover the internal CasesClientArgs from the request-scoped public client so we can
    // call the module-private workflow functions (ensureAuthorizedToRunWorkflow,
    // preflightWorkflowExecution, recordWorkflowExecution) directly without exposing them on
    // the public CasesSubClient / UserActionsSubClient interfaces.
    const clientArgs = getCasesClientInternalArgs(casesClient);

    // All-or-nothing: throws 403 if the caller lacks cases:<owner>/updateCase on any case.
    // Authorizes before reporting not-found errors so an unauthorized caller cannot learn
    // which IDs exist. One privilege round-trip for all owners via ensureAuthorized.
    // Returns entities so subsequent steps can reuse them without re-fetching the cases.
    const authorizedEntities = await ensureAuthorizedToRunWorkflow({ ids: caseIds }, clientArgs);

    // `origin` is optional. When absent the run is a list-surface (bulk) run: the caller
    // was not looking at any specific sub-entity, alert inputs are not permitted, and no
    // case fetch is needed. When present the run is scoped to a single case with a specific
    // sub-entity context; origin-entity membership and alert attachment are validated.
    // Parse and validate alertIds shape eagerly — any malformed entry throws 400 here,
    // before any case fetch, so the validated set equals what preprocessing later fetches.
    const selectedAlerts = parseSelectedAlertPairs(body.inputs);
    let theCase: Awaited<ReturnType<typeof casesClient.cases.get>> | undefined;
    if (body.origin === undefined) {
      if (selectedAlerts.length > 0) {
        throw Boom.badRequest('Alert inputs can only be used with a single case.');
      }
    } else {
      if (caseIds.length > 1) {
        throw Boom.badRequest(
          `Workflow origin type "${body.origin.type}" can only be used with a single case.`
        );
      }
      theCase = await casesClient.cases.get({ id: caseIds[0], includeComments: true });
      const attachedAlerts =
        selectedAlerts.length > 0
          ? await casesClient.attachments.getAllDocumentsAttachedToCase({
              caseId: caseIds[0],
              attachmentTypes: [AttachmentType.alert],
            })
          : [];
      validateOrigin({
        origin: body.origin,
        caseId: caseIds[0],
        selectedAlerts,
        theCase,
        attachedAlerts,
      });
    }

    // Fail fast before anything irreversible: check the per-case user-action limit for all cases.
    await preflightWorkflowExecution({ caseIds }, clientArgs);

    const workflow = await this.management.getWorkflow(workflowId, spaceId);
    if (!workflow) {
      throw Boom.notFound(`Workflow "${workflowId}" was not found.`);
    }
    if (!workflow.valid) {
      throw Boom.badRequest('Workflow is not valid.');
    }
    if (!workflow.enabled) {
      throw Boom.badRequest('Workflow is disabled. Enable it to run it.');
    }

    // Strip any client-supplied event.caseIds so the client cannot pre-seed the value;
    // the server re-injects the authorized set via eventOverrides after preprocessing.
    const { event: rawEvent, ...otherInputs } = body.inputs;
    const strippedEvent = isPlainObject(rawEvent)
      ? (({ caseIds: _dropped, ...rest }: Record<string, unknown>) => rest)(
          rawEvent as Record<string, unknown>
        )
      : rawEvent;
    const sanitizedInputs =
      strippedEvent !== undefined ? { ...otherInputs, event: strippedEvent } : otherInputs;

    const metadata = CasesWorkflowExecutionMetadataSchema.parse({
      schemaVersion: CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
      source: CASES_WORKFLOW_EXECUTION_SOURCE,
      caseIds,
      origin: body.origin,
    });

    // Use runWorkflow instead of executeWorkflow so the call returns as soon as the execution
    // is scheduled (truly fire-and-forget). executeWorkflow always waits ≥1 s for the execution
    // document to appear even when waitForCompletion=false, which adds measurable latency to
    // every interactive "run workflow from a case" click.
    //
    // eventOverrides injects the server-owned caseIds into `event` *after* alert preprocessing
    // runs. preprocessAlertInputs replaces the whole `event` object with the alert-event shape,
    // so pre-merging caseIds into event (before the call) would silently drop them on alert runs.
    const { workflowExecutionId } = await this.management.runWorkflowWithAlertPreprocessing({
      workflow: toWorkflowExecutionEngineModel(workflow),
      spaceId,
      inputs: sanitizedInputs,
      request,
      preprocessingContext: context,
      metadata,
      eventOverrides: { caseIds },
    });

    // One audit event per case keeps the audit trail queryable by individual case ID.
    this.logWorkflowRunAuditEvents({
      auditLogger,
      caseIds,
      workflowId,
      workflowExecutionId,
      outcome: 'success',
    });

    // Record the case activity immediately after the execution starts.
    // A failure to record must NOT be reported as an execution failure — the run did succeed.
    try {
      await recordWorkflowExecution(
        {
          caseIds,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            executionId: workflowExecutionId,
          },
          origin: buildActivityOrigin({ origin: body.origin, theCase }),
          // Pass the pre-authorized entities so recordWorkflowExecution can skip the redundant
          // getCases + ensureAuthorized round-trips that ensureAuthorizedToRunWorkflow already ran.
          entities: authorizedEntities,
        },
        clientArgs
      );
      return { workflowExecutionId, activityStatus: 'succeeded' };
    } catch (error) {
      this.logger.error(
        `Workflow "${workflowId}" execution "${workflowExecutionId}" started but its case activity could not be recorded: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      for (const caseId of caseIds) {
        this.logAuditEvent(auditLogger, {
          message: `Failed to record workflow [${workflowId}] execution [${workflowExecutionId}] in case [${caseId}] activity`,
          event: {
            action: 'case_workflow_activity_create',
            category: ['database'],
            type: ['creation'],
            outcome: 'failure',
          },
          error: { message: error instanceof Error ? error.message : String(error) },
          kibana: { saved_object: { type: CASE_SAVED_OBJECT, id: caseId } },
        });
      }
      return { workflowExecutionId, activityStatus: 'failed' };
    }
  }

  private logWorkflowRunAuditEvents({
    auditLogger,
    caseIds,
    workflowId,
    workflowExecutionId,
    outcome,
    error,
  }: {
    auditLogger: AuditLogger;
    caseIds: string[];
    workflowId: string;
    workflowExecutionId?: string;
    outcome: 'success' | 'failure';
    error?: unknown;
  }): void {
    const executionDetail = workflowExecutionId
      ? ` with execution ID [${workflowExecutionId}]`
      : '';
    for (const caseId of caseIds) {
      this.logAuditEvent(auditLogger, {
        message: `User ${
          outcome === 'success' ? 'started' : 'failed to start'
        } workflow [${workflowId}] from case [${caseId}]${executionDetail}`,
        event: {
          action: 'case_workflow_run',
          category: ['database'],
          type: ['creation'],
          outcome,
        },
        ...(error
          ? {
              error: {
                message: error instanceof Error ? error.message : String(error),
              },
            }
          : {}),
        kibana: {
          saved_object: {
            type: CASE_SAVED_OBJECT,
            id: caseId,
          },
        },
      });
    }
  }

  private logAuditEvent(auditLogger: AuditLogger, event: Parameters<AuditLogger['log']>[0]): void {
    try {
      auditLogger.log(event);
    } catch (error) {
      this.logger.debug(
        `Failed to write Cases workflow audit event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
