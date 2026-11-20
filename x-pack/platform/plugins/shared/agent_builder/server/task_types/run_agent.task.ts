/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeclinedRunError } from '@kbn/task-manager-plugin/server/task_running/errors';
import type { TaskHost } from '@kbn/task-manager-plugin/server/task_type_module';
import { defineWorkflowHostedTaskType } from '@kbn/workflows-execution-engine/server/task_types/define_workflow_task_type';
import type { ProcessWorkflowRuntime } from '@kbn/workflows-execution-engine/server/task_types/define_workflow_task_type';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import { taskTypes, type RunAgentTaskParams } from '../services/execution/task/task_definitions';
import type { TaskHandler } from '../services/execution/task/task_handler';
import { createAgentExecutionClient } from '../services/execution/persistence/agent_execution_client';
import { serializeExecutionError } from '../services/execution/utils/serialize_execution_error';

/** What this module reads as `host.plugins.agentBuilder` when it runs in Kibana (`registerHostedTaskType`'s `plugins`). */
interface AgentBuilderHostPlugin {
  taskHandler: TaskHandler;
}

const getKibanaTaskHandler = (host: TaskHost): TaskHandler | undefined =>
  (host.plugins?.agentBuilder as AgentBuilderHostPlugin | undefined)?.taskHandler;

/**
 * The task handler of this run, from the process's own agent builder registries
 * (`workflow_steps_contribution.ts` registers it as `agentBuilder.taskHandler`, built as a side
 * effect of the `agent-builder` and `workflow-steps` contributions registering against the engine's
 * process runtime). Declines the run, instead of serving it with a registration gap, when agent
 * builder is disabled in this process (nothing registered the service) or its registries differ from
 * what Kibana registered: the agent, or its tools, would otherwise behave differently than in Kibana.
 */
const resolveProcessTaskHandler = async (
  getProcessRuntime: () => Promise<ProcessWorkflowRuntime>
): Promise<TaskHandler> => {
  const { getService } = await getProcessRuntime();
  let getParityGap: (() => string | undefined) | undefined;
  let handler: TaskHandler | undefined;
  try {
    getParityGap = getService<() => string | undefined>('agentBuilder.parity');
    handler = getService<TaskHandler>('agentBuilder.taskHandler');
  } catch (error) {
    throw new DeclinedRunError(
      `agent builder is not available in this task process: ${(error as Error).message}`
    );
  }
  const gap = getParityGap();
  if (gap) {
    throw new DeclinedRunError(
      `the agent builder registrations of the process differ from Kibana's: the process ${gap}`
    );
  }
  return handler;
};

/**
 * `agent-builder:run-agent` as a task type module: Kibana runs it with the task handler its own
 * plugin built (`host.plugins.agentBuilder.taskHandler`, sent through `registerHostedTaskType`'s
 * `plugins`); a task process reuses the engine's `workflow-steps`/`agent-builder` contributions and
 * process services to build the same registries and resolve the same handler from them.
 *
 * Unlike the three native workflow task types, this is not itself a workflow run: it borrows their
 * contributions and declares (saved objects, settings, event log, task plugins) only because that is
 * where the agent builder process services are assembled (see `workflow_steps_contribution.ts`).
 */
export const taskType = defineWorkflowHostedTaskType(
  {
    type: taskTypes.runAgent,
    title: 'Agent Builder: Run agent execution',
    timeout: '20m',
    maxAttempts: 1,
  },
  (context, host, getProcessRuntime) => {
    const { taskInstance, fakeRequest, signal } = context;
    const { executionId } = taskInstance.params as RunAgentTaskParams;

    // `createTaskHandler`'s own `run` persists failures from inside an attempted execution; a
    // dispatch that never gets that far (no `fakeRequest`, a parity decline, agent builder disabled
    // in this process) would otherwise leave the execution document `scheduled` forever, since
    // nothing else reaches it. Marked failed here, directly, before the error propagates to Task
    // Manager as the run's own failure.
    const failExecution = async (error: unknown): Promise<never> => {
      try {
        const executionClient = createAgentExecutionClient({
          logger: host.logger,
          esClient: host.elasticsearch.asInternalUser,
        });
        await executionClient.updateStatus(executionId, ExecutionStatus.failed, {
          error: serializeExecutionError(error),
        });
      } catch (persistError) {
        host.logger.error(
          `Failed to mark execution ${executionId} failed after a dispatch error: ${
            (persistError as Error).message
          }`
        );
      }
      throw error;
    };

    if (!fakeRequest) {
      return {
        run: async () => {
          await failExecution(
            new Error('Cannot run agent execution without a request (missing API key)')
          );
        },
      };
    }

    const kibanaHandler = getKibanaTaskHandler(host);

    let processRuntime: Promise<ProcessWorkflowRuntime> | undefined;
    const getRuntime = () => (processRuntime ??= getProcessRuntime());

    let handlerPromise: Promise<TaskHandler> | undefined;
    const getHandler = (): Promise<TaskHandler> =>
      (handlerPromise ??= kibanaHandler
        ? Promise.resolve(kibanaHandler)
        : resolveProcessTaskHandler(getRuntime));

    return {
      run: async () => {
        signal.throwIfAborted();
        const handler = await getHandler().catch(failExecution);
        await handler.run({ executionId, fakeRequest });
        return { state: {} };
      },
      cancel: async () => {
        const handler = await getHandler().catch(() => undefined);
        await handler?.cancel({ executionId });
      },
      cleanup: async () => {
        if (!processRuntime) return;
        const resolved = await processRuntime.catch(() => undefined);
        await resolved?.stop();
      },
    };
  }
);
