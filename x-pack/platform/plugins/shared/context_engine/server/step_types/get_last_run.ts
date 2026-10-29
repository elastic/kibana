/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, ExecutionType, type WorkflowExecutionListDto } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getLastRunStepCommonDefinition,
  type GetLastRunOutput,
} from '../../common/step_types/get_last_run';
import { assertContextEngineEnabled } from './helpers';
import { toStepError } from './to_step_error';

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_WINDOW_HOURS = 24;
/** A few, so the run in progress can be skipped if history ever lists it as completed. */
const LAST_RUNS_READ = 3;

/** The part of the Workflows management API that reads a workflow's runs. */
export interface WorkflowExecutionHistory {
  getWorkflowExecutions(
    params: {
      workflowId: string;
      statuses: ExecutionStatus[];
      executionTypes: ExecutionType[];
      sortField: 'finishedAt';
      sortOrder: 'desc';
      size: number;
      omitStepRuns: boolean;
      request: KibanaRequest;
    },
    spaceId: string
  ): Promise<WorkflowExecutionListDto>;
}

export interface LastRunStepDependencies {
  getExecutionHistory: () => Promise<WorkflowExecutionHistory | undefined>;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
}

/** The window a run should process, from the last successful run of its workflow. */
export const resolveLastRunWindow = ({
  lastSuccess,
  now,
  defaultHours = DEFAULT_WINDOW_HOURS,
  maxHours,
}: {
  lastSuccess?: { id: string; startedAt: string; finishedAt?: string };
  now: Date;
  defaultHours?: number;
  maxHours?: number;
}): GetLastRunOutput => {
  const earliest = maxHours !== undefined ? now.getTime() - maxHours * HOUR_MS : -Infinity;
  const start = lastSuccess
    ? new Date(lastSuccess.startedAt).getTime()
    : now.getTime() - defaultHours * HOUR_MS;
  const since = Math.max(start, earliest);
  return {
    first_run: lastSuccess === undefined,
    since: new Date(since).toISOString(),
    hours_since: Math.max(1, Math.ceil((now.getTime() - since) / HOUR_MS)),
    ...(lastSuccess && {
      last_success: {
        execution_id: lastSuccess.id,
        started_at: lastSuccess.startedAt,
        ...(lastSuccess.finishedAt && { finished_at: lastSuccess.finishedAt }),
      },
    }),
  };
};

export const getGetLastRunStepDefinition = ({
  getExecutionHistory,
  isContextEngineEnabled,
}: LastRunStepDependencies) =>
  createServerStepDefinition({
    ...getLastRunStepCommonDefinition,
    handler: async (context) => {
      try {
        const { workflow, execution } = context.contextManager.getContext();
        await assertContextEngineEnabled(isContextEngineEnabled, workflow.spaceId);
        const history = await getExecutionHistory();
        if (!history) {
          throw new Error('Workflow execution history is not available.');
        }
        const { results } = await history.getWorkflowExecutions(
          {
            workflowId: workflow.id,
            statuses: [ExecutionStatus.COMPLETED],
            executionTypes: [ExecutionType.PRODUCTION],
            sortField: 'finishedAt',
            sortOrder: 'desc',
            size: LAST_RUNS_READ,
            omitStepRuns: true,
            request: context.contextManager.getFakeRequest(),
          },
          workflow.spaceId
        );
        const lastSuccess = results.find(({ id }) => id !== execution.id);
        return {
          output: resolveLastRunWindow({
            lastSuccess,
            now: new Date(),
            defaultHours: context.input.default_hours,
            maxHours: context.input.max_hours,
          }),
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read the last run');
      }
    },
  });
