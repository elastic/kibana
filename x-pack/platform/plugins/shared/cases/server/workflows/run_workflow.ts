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
import { CASE_SAVED_OBJECT } from '../../common/constants';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../common/types/domain/user_action/workflow/constants';
import type {
  CaseWorkflowRunOrigin,
  RunCaseWorkflowRequest,
  RunCaseWorkflowResponse,
} from '../../common/types/api';
import type { WorkflowOrigin } from '../../common/types/domain/user_action/workflow/v1';
import { isAlertAttachmentType, toStringArray } from '../../common/utils/attachments';
import type { CasesClient } from '../client';
import type { CasesRequestHandlerContext } from '../types';

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

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const findEventEntity = (
  event: Record<string, unknown>,
  property: string,
  id: string
): Record<string, unknown> | undefined => {
  const entities = event[property];
  if (!Array.isArray(entities)) {
    return undefined;
  }

  return entities.map(getRecord).find((entity) => entity?._id === id || entity?.id === id);
};

const buildActivityOrigin = (
  origin: CaseWorkflowRunOrigin,
  inputs: Record<string, unknown>
): WorkflowOrigin => {
  const event = getRecord(inputs.event);
  if (!event) {
    return origin;
  }

  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE) {
    const alert =
      findEventEntity(event, 'alerts', origin.id) ?? findEventEntity(event, 'alertIds', origin.id);
    const index = alert?._index;
    return typeof index === 'string' ? { ...origin, index } : origin;
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    const observable = findEventEntity(event, 'observables', origin.id);
    const typeKey = observable?.typeKey;
    const value = observable?.value;
    return typeof typeKey === 'string' && typeof value === 'string'
      ? { ...origin, typeKey, value }
      : origin;
  }

  return origin;
};

const getSelectedAlertIds = (inputs: Record<string, unknown>): string[] => {
  const event = getRecord(inputs.event);
  if (!event || !Array.isArray(event.alertIds)) {
    return [];
  }

  return event.alertIds
    .map(getRecord)
    .map((alert) => alert?._id)
    .filter((id): id is string => typeof id === 'string');
};

const getAttachedAlertIds = (
  comments: NonNullable<Awaited<ReturnType<CasesClient['cases']['get']>>['comments']>
): Set<string> =>
  comments.reduce((alertIds, comment) => {
    if (!isAlertAttachmentType(comment.type)) {
      return alertIds;
    }

    let ids: string[] = [];
    if ('alertId' in comment) {
      ids = toStringArray(comment.alertId);
    } else if ('attachmentId' in comment) {
      ids = toStringArray(comment.attachmentId);
    }
    ids.forEach((id) => alertIds.add(id));
    return alertIds;
  }, new Set<string>());

const validateOrigin = async ({
  origin,
  caseId,
  inputs,
  casesClient,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  inputs: Record<string, unknown>;
  casesClient: CasesClient;
}): Promise<void> => {
  const theCase = await casesClient.cases.get({ id: caseId, includeComments: true });

  if (origin.type === CASE_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    if (origin.id !== caseId) {
      throw Boom.badRequest(`Workflow origin id must match case id "${caseId}".`);
    }
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    if (!theCase.observables.some(({ id }) => id === origin.id)) {
      throw Boom.badRequest(`Observable "${origin.id}" does not belong to case "${caseId}".`);
    }
    return;
  }

  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    const attachedAlertIds = getAttachedAlertIds(theCase.comments ?? []);
    const selectedAlertIds = getSelectedAlertIds(inputs);
    if (selectedAlertIds.length === 0 || selectedAlertIds.some((id) => !attachedAlertIds.has(id))) {
      throw Boom.badRequest('All selected alerts must belong to the case.');
    }
    if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE && !selectedAlertIds.includes(origin.id)) {
      throw Boom.badRequest(`Alert workflow origin "${origin.id}" is not selected.`);
    }
  }
};

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
    const { workflowExecutionId } = await this.management.executeWorkflow({
      workflowId,
      spaceId,
      request,
      inputs: processedInputs,
      waitForCompletion: false,
      metadata: {
        source: 'cases',
        caseId,
        origin: body.origin,
      },
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
