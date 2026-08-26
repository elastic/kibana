/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuditLogger, SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { preprocessAlertInputs } from '@kbn/workflows-management-plugin/server';
import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
  CasesWorkflowExecutionMetadataSchema,
} from '../../../common/types/api/workflow/v1';
import type {
  CaseWorkflowRunOrigin,
  RunCaseWorkflowRequest,
  RunCaseWorkflowResponse,
} from '../../../common/types/api';
import type { CasesClient } from '../../client';
import type { CasesRequestHandlerContext } from '../../types';
import { validateOrigin, validateMultiCaseOrigin } from './validate_origin';

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
  /**
   * Returns true when the current license is active and meets the minimum
   * tier required by Workflows Management (Enterprise). Evaluated on every
   * request so that mid-session license changes are reflected immediately.
   */
  isLicenseValid: () => boolean;
  onWorkflowStarted?: (event: CasesWorkflowStartedEvent) => Promise<void>;
}

export interface CasesWorkflowStartedEvent {
  caseIds: string[];
  workflow: {
    id: string;
    name: string;
    executionId: string;
  };
  origin: CaseWorkflowRunOrigin;
  inputs: Record<string, unknown>;
}

export class CasesWorkflowRunService {
  private readonly management: WorkflowsServerPluginSetup['management'];
  private readonly logger: Logger;
  private readonly audit: SecurityPluginSetup['audit'];
  private readonly isLicenseValid: () => boolean;
  private readonly onWorkflowStarted?: (event: CasesWorkflowStartedEvent) => Promise<void>;

  constructor({
    management,
    logger,
    audit,
    isLicenseValid,
    onWorkflowStarted,
  }: CasesWorkflowRunServiceDeps) {
    this.management = management;
    this.logger = logger;
    this.audit = audit;
    this.isLicenseValid = isLicenseValid;
    this.onWorkflowStarted = onWorkflowStarted;
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

    // Require an active Enterprise license — matches the gate on the Workflows Management
    // public execution route (withAvailabilityCheck → wrapRouteWithLicenseCheck).
    if (!this.isLicenseValid()) {
      throw Boom.forbidden('Workflows require an active Enterprise license.');
    }

    const { caseIds } = body;

    // All-or-nothing: throws 403 if the caller lacks cases:<owner>/updateCase on any case.
    // Authorizes before reporting not-found errors so an unauthorized caller cannot learn
    // which IDs exist. One privilege round-trip for all owners via ensureAuthorized.
    await casesClient.cases.ensureAuthorizedToUpdate({ ids: caseIds });

    // For single-case runs, fetch the case to validate sub-entity origins and alert membership.
    // For multi-case runs, only cases.case origin is legal — no case fetch is needed.
    if (caseIds.length > 1) {
      validateMultiCaseOrigin({
        origin: body.origin,
        caseIds,
        inputs: body.inputs,
      });
    } else {
      const theCase = await casesClient.cases.get({ id: caseIds[0], includeComments: true });
      validateOrigin({
        origin: body.origin,
        caseId: caseIds[0],
        inputs: body.inputs,
        theCase,
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

    // The server owns event.caseIds: overwrite any client-supplied value so the set the workflow
    // sees is exactly the set that was authorized. Preserve other event fields (e.g. triggerType,
    // alertIds) that preprocessAlertInputs reads.
    const rawEvent = body.inputs.event;
    const event =
      typeof rawEvent === 'object' && rawEvent !== null && !Array.isArray(rawEvent)
        ? (rawEvent as Record<string, unknown>)
        : {};
    const mergedInputs = { ...body.inputs, event: { ...event, caseIds } };

    const processedInputs = await preprocessAlertInputs(mergedInputs, context, spaceId, this.logger);
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
    const workflowExecutionId = await this.management.runWorkflow(
      toWorkflowExecutionEngineModel(workflow),
      spaceId,
      processedInputs,
      request,
      undefined,
      metadata
    );
    // One audit event per case keeps the audit trail queryable by individual case ID.
    this.logWorkflowRunAuditEvents({
      auditLogger,
      caseIds,
      workflowId,
      workflowExecutionId,
      outcome: 'success',
    });

    if (this.onWorkflowStarted) {
      try {
        await this.onWorkflowStarted({
          caseIds,
          inputs: processedInputs,
          origin: body.origin,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            executionId: workflowExecutionId,
          },
        });
      } catch (error) {
        this.logger.error(
          `Workflow "${workflowId}" execution "${workflowExecutionId}" started but its post-execution callback failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

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
