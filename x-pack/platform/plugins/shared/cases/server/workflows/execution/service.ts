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
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
  CasesWorkflowExecutionMetadataSchema,
} from '../../../common/types/api/workflow/v1';
import type { RunCaseWorkflowRequest, RunCaseWorkflowResponse } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import type { CasesRequestHandlerContext } from '../../types';
import { buildActivityOrigin } from './build_activity_origin';
import { validateOrigin } from './validate_origin';

interface RunWorkflowParams {
  caseId: string;
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
    caseId,
    workflowId,
    body,
    request,
    context,
    casesClient,
    spaceId,
  }: RunWorkflowParams): Promise<RunCaseWorkflowResponse> {
    const auditLogger = this.audit.asScoped(request);

    try {
      return await this.runWorkflow({
        caseId,
        workflowId,
        body,
        request,
        context,
        casesClient,
        spaceId,
        auditLogger,
      });
    } catch (error) {
      this.logWorkflowRunAuditEvent({
        auditLogger,
        caseId,
        workflowId,
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  private async runWorkflow({
    caseId,
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

    await casesClient.userActions.preflightWorkflowExecution({ caseId });
    await validateOrigin({
      origin: body.origin,
      caseId,
      inputs: body.inputs,
      casesClient,
    });

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

    const processedInputs = await preprocessAlertInputs(body.inputs, context, spaceId, this.logger);
    const metadata = CasesWorkflowExecutionMetadataSchema.parse({
      schemaVersion: CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
      source: CASES_WORKFLOW_EXECUTION_SOURCE,
      caseId,
      origin: body.origin,
    });
    const { workflowExecutionId } = await this.management.executeWorkflow({
      workflowId,
      spaceId,
      request,
      inputs: processedInputs,
      waitForCompletion: false,
      metadata,
    });
    this.logWorkflowRunAuditEvent({
      auditLogger,
      caseId,
      workflowId,
      workflowExecutionId,
      outcome: 'success',
    });

    try {
      await casesClient.userActions.recordWorkflowExecution({
        caseId,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          executionId: workflowExecutionId,
        },
        origin: buildActivityOrigin(body.origin, processedInputs),
      });
      return { workflowExecutionId, activityStatus: 'succeeded' };
    } catch (error) {
      this.logger.error(
        `Workflow "${workflowId}" execution "${workflowExecutionId}" started but its case activity could not be recorded: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.logAuditEvent(auditLogger, {
        message: `Failed to record workflow execution [${workflowExecutionId}] in case [${caseId}] activity`,
        event: {
          action: 'case_workflow_activity_create',
          category: ['database'],
          type: ['creation'],
          outcome: 'failure',
        },
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
        kibana: {
          saved_object: {
            type: CASE_SAVED_OBJECT,
            id: caseId,
          },
        },
      });
      return { workflowExecutionId, activityStatus: 'failed' };
    }
  }

  private logWorkflowRunAuditEvent({
    auditLogger,
    caseId,
    workflowId,
    workflowExecutionId,
    outcome,
    error,
  }: {
    auditLogger: AuditLogger;
    caseId: string;
    workflowId: string;
    workflowExecutionId?: string;
    outcome: 'success' | 'failure';
    error?: unknown;
  }): void {
    const executionDetail = workflowExecutionId
      ? ` with execution ID [${workflowExecutionId}]`
      : '';
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
