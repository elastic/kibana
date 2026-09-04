/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isPlainObject, omit } from 'lodash';
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
import type { CasesRequestHandlerContext } from '../../types';
import { parseSelectedAlertPairs, validateOrigin } from './validate_origin';
import type { EnsureAuthorizedToRunWorkflowParams } from './authorize_workflow_run';

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
  getWorkflowRunAuthorizer: (request: KibanaRequest) => Promise<{
    ensureAuthorizedToRunWorkflow: (params: EnsureAuthorizedToRunWorkflowParams) => Promise<void>;
  }>;
}

export class CasesWorkflowRunService {
  private readonly management: WorkflowsServerPluginSetup['management'];
  private readonly logger: Logger;
  private readonly audit: SecurityPluginSetup['audit'];
  private readonly getWorkflowRunAuthorizer: CasesWorkflowRunServiceDeps['getWorkflowRunAuthorizer'];

  constructor({
    management,
    logger,
    audit,
    getWorkflowRunAuthorizer,
  }: CasesWorkflowRunServiceDeps) {
    this.management = management;
    this.logger = logger;
    this.audit = audit;
    this.getWorkflowRunAuthorizer = getWorkflowRunAuthorizer;
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

    // All-or-nothing: throws 403 if the caller lacks cases:<owner>/updateCase on any case.
    // Authorizes before reporting not-found errors so an unauthorized caller cannot learn
    // which IDs exist. One privilege round-trip for all owners via ensureAuthorized.
    const { ensureAuthorizedToRunWorkflow } = await this.getWorkflowRunAuthorizer(request);
    await ensureAuthorizedToRunWorkflow({ ids: caseIds });

    // `origin` is optional. When absent the run is a list-surface (bulk) run: the caller
    // was not looking at any specific sub-entity, alert inputs are not permitted, and no
    // case fetch is needed. When present the run is scoped to a single case with a specific
    // sub-entity context; origin-entity membership and alert attachment are validated.
    // Parse and validate alertIds shape eagerly — any malformed entry throws 400 here,
    // before any case fetch, so the validated set equals what preprocessing later fetches.
    const selectedAlerts = parseSelectedAlertPairs(body.inputs);

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
      const theCase = await casesClient.cases.get({ id: caseIds[0] });
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
      ? omit(rawEvent as Record<string, unknown>, 'caseIds')
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

    return { workflowExecutionId };
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
