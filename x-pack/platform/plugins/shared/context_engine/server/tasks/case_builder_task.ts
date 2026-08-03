/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { CASE_BUILDER_TASK_TYPE, traceClassifierTaskId } from '../../common/constants';
import { CasesService } from '../cases/service';
import { buildCases } from './transform';

const EPOCH = '1970-01-01T00:00:00.000Z';
const BATCH_SIZE = 1000;

interface EsqlResult {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

/** Runs an ES|QL query and returns rows as column-name → value objects. */
const esqlRows = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<Array<Record<string, unknown>>> => {
  const result = (await esClient.esql.query({ query })) as unknown as EsqlResult;
  const names = result.columns.map((column) => column.name);
  return result.values.map((row) =>
    Object.fromEntries(names.map((name, index) => [name, row[index]]))
  );
};

/**
 * `case_builder` Task Manager task: reads new `execute_tool` spans from the
 * configured trace index, transforms them into cases, and writes them to
 * `.contextengine-cases`. Deterministic — no LLM. Scoped per AI index; the
 * watermark (max processed `@timestamp`) is carried in task state.
 */
export const registerCaseBuilderTask = (
  taskManager: TaskManagerSetupContract,
  {
    core,
    logger,
    getTaskManager,
  }: {
    core: CoreSetup;
    logger: Logger;
    getTaskManager: () => TaskManagerStartContract | undefined;
  }
) => {
  taskManager.registerTaskDefinitions({
    [CASE_BUILDER_TASK_TYPE]: {
      title: 'Context Engine: case builder',
      timeout: '10m',
      createTaskRunner: ({ taskInstance }: RunContext) => ({
        async run() {
          const { aiIndexId, tracesIndex } = taskInstance.params as {
            aiIndexId: string;
            tracesIndex: string;
          };
          const watermark = (taskInstance.state as { watermark?: string }).watermark ?? EPOCH;

          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;

          // Agent identity lives on invoke_agent spans, not on the tool spans.
          const agentRows = await esqlRows(
            esClient,
            `FROM ${tracesIndex} | WHERE gen_ai.operation.name == "invoke_agent" ` +
              `| KEEP gen_ai.conversation.id, gen_ai.agent.name | LIMIT 10000`
          );
          const convAgent = new Map<string, string>();
          for (const row of agentRows) {
            const conversationId = row['gen_ai.conversation.id'];
            const agentName = row['gen_ai.agent.name'];
            if (typeof conversationId === 'string' && typeof agentName === 'string') {
              convAgent.set(conversationId, agentName);
            }
          }

          const toolRows = await esqlRows(
            esClient,
            `FROM ${tracesIndex} | WHERE gen_ai.operation.name == "execute_tool" ` +
              `AND @timestamp > "${watermark}" ` +
              `| KEEP @timestamp, trace_id, span_id, gen_ai.conversation.id, gen_ai.tool.name, ` +
              `gen_ai.tool.call.id, gen_ai.tool.call.arguments, gen_ai.tool.call.result, ` +
              `duration, status.code, status.message | SORT @timestamp ASC | LIMIT ${BATCH_SIZE}`
          );

          if (toolRows.length === 0) {
            return { state: { watermark } };
          }

          const cases = buildCases({ toolRows, convAgent, aiIndexId });
          const casesService = new CasesService({ esClient, logger });
          await casesService.ensureIndex();
          await casesService.write(cases);

          const newWatermark = cases.reduce(
            (max, current) => (current['@timestamp'] > max ? current['@timestamp'] : max),
            watermark
          );
          logger.debug(
            `case_builder[${aiIndexId}]: wrote ${cases.length} cases; watermark ${newWatermark}`
          );

          // Chain the classifier so patterns are produced right after these cases are
          // written, instead of waiting for its next scheduled tick. This closes the
          // cold-start ordering race where the classifier runs before any cases exist.
          if (cases.length > 0) {
            try {
              await getTaskManager()?.runSoon(traceClassifierTaskId(aiIndexId));
            } catch (error) {
              logger.debug(
                `case_builder[${aiIndexId}]: could not trigger the classifier: ${error.message}`
              );
            }
          }

          return { state: { watermark: newWatermark } };
        },
      }),
    },
  });
};
