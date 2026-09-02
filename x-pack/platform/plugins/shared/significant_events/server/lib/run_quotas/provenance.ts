/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import Boom from '@hapi/boom';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ExecutionStatus } from '@kbn/workflows';
import { NonTerminalExecutionStatuses, type EsWorkflowStepExecution } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { getEmitterWorkflowExecutionIdFromRequest } from '@kbn/workflows-extensions/server';
import { validateStreamName } from '@kbn/streams-schema';
import { MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES } from '../../../common/constants';
import type { WorkerRunBudgetGroupId } from '../../../common/run_quotas';

const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';
const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';

interface RunQuotaWorkflowExecutionContext {
  parentWorkflowExecutionId?: string;
  inputs?: Record<string, unknown>;
}

export interface RunQuotaWorkflowExecution {
  id: string;
  workflowId: string;
  spaceId: string;
  status: ExecutionStatus;
  triggeredBy?: string;
  taskRunAt?: string | null;
  context?: RunQuotaWorkflowExecutionContext;
  stepExecutionIds?: string[];
}

export interface RunQuotaExecutionReader {
  getExecution: (executionId: string) => Promise<RunQuotaWorkflowExecution | undefined>;
  getStepExecutions: (ids: string[]) => Promise<EsWorkflowStepExecution[]>;
}

const getMgetSources = <T>(response: Awaited<ReturnType<ElasticsearchClient['mget']>>): T[] =>
  response.docs.flatMap((document) =>
    'found' in document && document.found && document._source ? [document._source as T] : []
  );

export const createRunQuotaExecutionReader = (
  asInternalUser: ElasticsearchClient
): RunQuotaExecutionReader => ({
  getExecution: async (executionId) => {
    const response = await asInternalUser.mget<RunQuotaWorkflowExecution>({
      docs: [{ _index: WORKFLOWS_EXECUTIONS_INDEX, _id: executionId }],
    });
    return getMgetSources<RunQuotaWorkflowExecution>(response)[0];
  },
  getStepExecutions: async (ids) => {
    if (ids.length === 0) {
      return [];
    }
    const response = await asInternalUser.mget<EsWorkflowStepExecution>({
      docs: ids.map((id) => ({ _index: WORKFLOWS_STEP_EXECUTIONS_INDEX, _id: id })),
    });
    return getMgetSources<EsWorkflowStepExecution>(response);
  },
});

const provenanceError = (): Error =>
  Boom.forbidden('The request does not have valid managed workflow execution provenance');

const requireEmitterMatch = (request: KibanaRequest, executionId: string): void => {
  if (getEmitterWorkflowExecutionIdFromRequest(request) !== executionId) {
    throw provenanceError();
  }
};

const requireExecution = async (
  executionReader: RunQuotaExecutionReader,
  executionId: string
): Promise<RunQuotaWorkflowExecution> => {
  const execution = await executionReader.getExecution(executionId);
  if (!execution) {
    throw provenanceError();
  }
  return execution;
};

const isNonTerminal = (status: ExecutionStatus): boolean =>
  NonTerminalExecutionStatuses.includes(status);

const getExpectedWorkerId = (group: WorkerRunBudgetGroupId): string =>
  group === 'detection'
    ? SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID
    : SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID;

const getExpectedDriverId = (group: WorkerRunBudgetGroupId, spaceId: string): string =>
  group === 'detection'
    ? `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-${spaceId}`
    : SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID;

const buildGrantKey = (parts: Record<string, string | number>): string =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

const getWorkerGrantDiscriminator = (
  group: WorkerRunBudgetGroupId,
  execution: RunQuotaWorkflowExecution
): { quotaSlot: number } | { streamName: string } => {
  const inputs = execution.context?.inputs;
  if (group === 'detection') {
    const quotaSlot = inputs?.quotaSlot;
    if (
      typeof quotaSlot !== 'number' ||
      !Number.isInteger(quotaSlot) ||
      quotaSlot < 0 ||
      quotaSlot >= MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES
    ) {
      throw provenanceError();
    }
    return { quotaSlot };
  }

  const streamName = inputs?.streamName;
  if (typeof streamName !== 'string' || !validateStreamName(streamName).valid) {
    throw provenanceError();
  }
  return { streamName };
};

export interface ValidatedWorkerProvenance {
  execution: RunQuotaWorkflowExecution;
  parent: RunQuotaWorkflowExecution;
  grantKey: string;
}

export const validateWorkerProvenance = async ({
  request,
  executionId,
  group,
  spaceId,
  executionReader,
}: {
  request: KibanaRequest;
  executionId: string;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  executionReader: RunQuotaExecutionReader;
}): Promise<ValidatedWorkerProvenance> => {
  requireEmitterMatch(request, executionId);
  const execution = await requireExecution(executionReader, executionId);
  if (
    execution.workflowId !== getExpectedWorkerId(group) ||
    execution.spaceId !== spaceId ||
    !isNonTerminal(execution.status)
  ) {
    throw provenanceError();
  }

  const parentExecutionId = execution.context?.parentWorkflowExecutionId;
  if (!parentExecutionId) {
    throw provenanceError();
  }
  const parent = await requireExecution(executionReader, parentExecutionId);
  const expectedParentWorkflowId = getExpectedDriverId(group, spaceId);
  if (
    parent.workflowId !== expectedParentWorkflowId ||
    parent.spaceId !== spaceId ||
    parent.triggeredBy !== 'scheduled' ||
    !parent.taskRunAt
  ) {
    throw provenanceError();
  }

  const discriminator = getWorkerGrantDiscriminator(group, execution);
  const grantKey = buildGrantKey({
    group,
    ...(group === 'detection' ? { spaceId } : {}),
    parentWorkflowId: parent.workflowId,
    taskRunAt: parent.taskRunAt,
    ...discriminator,
  });

  return { execution, parent, grantKey };
};

export interface ValidatedHeartbeatProvenance {
  execution: RunQuotaWorkflowExecution;
  recordedAt: string;
}

export const validateHeartbeatProvenance = async ({
  request,
  executionId,
  group,
  spaceId,
  executionReader,
}: {
  request: KibanaRequest;
  executionId: string;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  executionReader: RunQuotaExecutionReader;
}): Promise<ValidatedHeartbeatProvenance> => {
  requireEmitterMatch(request, executionId);
  const execution = await requireExecution(executionReader, executionId);
  if (
    execution.workflowId !== getExpectedDriverId(group, spaceId) ||
    execution.spaceId !== spaceId ||
    execution.triggeredBy !== 'scheduled' ||
    !isNonTerminal(execution.status) ||
    !execution.taskRunAt
  ) {
    throw provenanceError();
  }

  return { execution, recordedAt: execution.taskRunAt };
};

export const validateInvestigationProvenance = async ({
  request,
  executionId,
  spaceId,
  executionReader,
}: {
  request: KibanaRequest;
  executionId: string;
  spaceId: string;
  executionReader: RunQuotaExecutionReader;
}): Promise<ValidatedWorkerProvenance> =>
  validateWorkerProvenance({
    request,
    executionId,
    group: 'detection',
    spaceId,
    executionReader,
  });
