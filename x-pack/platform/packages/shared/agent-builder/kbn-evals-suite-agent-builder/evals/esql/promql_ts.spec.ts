/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset, Example, ExperimentTask } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import type { EsqlQueryExpectation, QueryRule } from '../../src/esql_query_evaluators';
import {
  createEsqlExecutionEvaluators,
  createEsqlQueryRunner,
  createQueryRulesEvaluator,
  createSourceCommandEvaluator,
} from '../../src/esql_query_evaluators';
import type { ToolResult, TurnQueries } from '../../src/esql_tool_call_queries';
import {
  createGeneratedQueriesOnlyEvaluator,
  getToolResultQueries,
  getTurnQueries,
} from '../../src/esql_tool_call_queries';
import { evaluate as base } from '../../src/evaluate';
import type { NodeExporterTimeRange } from '../../src/fixtures/node_exporter_metrics';
import {
  cleanNodeExporterMetrics,
  loadNodeExporterMetrics,
  NODE_EXPORTER_INDEX,
} from '../../src/fixtures/node_exporter_metrics';

type PromqlTsExample = Example<
  { question: string; context?: string },
  EsqlQueryExpectation,
  { category: string }
>;

interface ToolTaskOutput {
  esql: string;
  results: unknown[];
  errors: unknown[];
}

const RANGE_START: QueryRule = {
  pattern: String.raw`\bstart\s*=\s*\?_tstart\b`,
  present: true,
  description: 'binds start to ?_tstart',
};
const RANGE_END: QueryRule = {
  pattern: String.raw`\bend\s*=\s*\?_tend\b`,
  present: true,
  description: 'binds end to ?_tend',
};
const INSTANT_TIME: QueryRule = {
  pattern: String.raw`\btime\s*=\s*\?_tend\b`,
  present: true,
  description: 'binds time to ?_tend',
};
const NO_FIXED_RANGE_SELECTOR: QueryRule = {
  // Matches durations such as [5m] or [1h30m] and subqueries such as [1h:5m].
  pattern: String.raw`\[\s*(?:\d+(?:ms|[smhdwy]))+\s*(?::\s*(?:\d+(?:ms|[smhdwy]))*\s*)?\]`,
  present: false,
  description: 'no fixed range selector such as [5m]',
};
const NO_HARDCODED_TIME: QueryRule = {
  pattern: String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}`,
  present: false,
  description: 'no hardcoded timestamp',
};
const TS_TIME_RANGE: QueryRule = {
  pattern: String.raw`^(?=[\s\S]*\?_tstart\b)(?=[\s\S]*\?_tend\b)`,
  present: true,
  description: 'filters on ?_tstart and ?_tend',
};
const TS_RATE: QueryRule = {
  pattern: String.raw`\bRATE\s*\(`,
  flags: 'i',
  present: true,
  description: 'uses RATE on the counter',
};
const TS_NO_RATE: QueryRule = {
  pattern: String.raw`\b(I?RATE|INCREASE|I?DELTA|DERIV)\s*\(`,
  flags: 'i',
  present: false,
  description: 'aggregates the gauge values rather than their change',
};
const TS_TBUCKET: QueryRule = {
  pattern: String.raw`\bTBUCKET\s*\(`,
  flags: 'i',
  present: true,
  description: 'buckets time with TBUCKET',
};

const PROMQL_RANGE = `PROMQL index=${NODE_EXPORTER_INDEX} start=?_tstart end=?_tend`;
const PROMQL_INSTANT = `PROMQL index=${NODE_EXPORTER_INDEX} time=?_tend`;
const TS_SOURCE = `TS ${NODE_EXPORTER_INDEX}
| WHERE TRANGE(?_tstart, ?_tend)`;

const RANGE_RULES = [RANGE_START, RANGE_END, NO_FIXED_RANGE_SELECTOR, NO_HARDCODED_TIME];
const INSTANT_RULES = [INSTANT_TIME, NO_FIXED_RANGE_SELECTOR, NO_HARDCODED_TIME];

const examples: PromqlTsExample[] = [
  {
    input: {
      question: 'Using PromQL, show the CPU utilization in percent per instance over time.',
    },
    output: {
      query: `${PROMQL_RANGE} cpu=(100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}))))`,
      sourceCommand: 'PROMQL',
      rules: RANGE_RULES,
    },
    metadata: { category: 'promql_range' },
  },
  {
    input: {
      question: 'Using PromQL, which instance currently has the highest 5-minute load average?',
    },
    output: {
      query: `${PROMQL_INSTANT} load=(topk(1, node_load5))`,
      sourceCommand: 'PROMQL',
      rules: INSTANT_RULES,
    },
    metadata: { category: 'promql_instant' },
  },
  {
    input: { question: 'What is the current uptime in seconds of each instance? Use PromQL.' },
    output: {
      query: `${PROMQL_INSTANT} uptime=(time() - node_boot_time_seconds)`,
      sourceCommand: 'PROMQL',
      rules: INSTANT_RULES,
    },
    metadata: { category: 'promql_instant' },
  },
  {
    input: {
      question: 'Show the CPU utilization in percent per instance over time.',
      context: 'You MUST use the PROMQL command.',
    },
    output: {
      query: `${PROMQL_RANGE} cpu=(100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}))))`,
      sourceCommand: 'PROMQL',
      rules: RANGE_RULES,
    },
    metadata: { category: 'promql_from_context' },
  },
  {
    input: {
      question: 'Show the network receive throughput in bytes per second per instance over time.',
    },
    output: {
      query: `${TS_SOURCE}
| STATS receive = SUM(RATE(node_network_receive_bytes_total)) BY instance, bucket = TBUCKET(5 minutes)`,
      sourceCommand: 'TS',
      rules: [TS_TIME_RANGE, TS_RATE, TS_TBUCKET, NO_HARDCODED_TIME],
    },
    metadata: { category: 'ts_counter' },
  },
  {
    input: {
      question: 'Show the maximum 1-minute load average per instance in 5 minute buckets.',
    },
    output: {
      query: `${TS_SOURCE}
| STATS load = MAX(MAX_OVER_TIME(node_load1)) BY instance, bucket = TBUCKET(5 minutes)`,
      sourceCommand: 'TS',
      rules: [TS_TIME_RANGE, TS_NO_RATE, TS_TBUCKET, NO_HARDCODED_TIME],
    },
    metadata: { category: 'ts_gauge' },
  },
  {
    input: { question: 'How many bytes did each instance write to disk in total?' },
    output: {
      query: `${TS_SOURCE}
| STATS written = SUM(INCREASE(node_disk_written_bytes_total)) BY instance`,
      sourceCommand: 'TS',
      rules: [TS_TIME_RANGE, NO_HARDCODED_TIME],
    },
    metadata: { category: 'ts_counter' },
  },
];

type FollowUpExample = Example<
  { turns: readonly [string, string] },
  EsqlQueryExpectation,
  { category: string }
>;

interface FollowUpTaskOutput extends TurnQueries {
  /** Queries generated in both turns, which the agent may reuse in the second one. */
  conversationGenerated: string[];
  messages: unknown[];
  errors: unknown[];
}

const DATA_STREAM_HINT = `The node_exporter metrics are in the ${NODE_EXPORTER_INDEX} data stream.`;

// The second question asks for a counter rate, which a query written from memory of Prometheus
// dashboards typically gives a fixed range selector such as [5m].
const answerFollowUpExamples: FollowUpExample[] = [
  {
    input: {
      turns: [
        `Using PromQL, show the 5-minute load average per instance over the last 2 hours. ${DATA_STREAM_HINT}`,
        'Now, also with PromQL, show the network receive throughput in bytes per second per instance.',
      ],
    },
    output: {
      query: `${PROMQL_RANGE} receive=(sum by (instance) (rate(node_network_receive_bytes_total)))`,
      sourceCommand: 'PROMQL',
      rules: RANGE_RULES,
    },
    metadata: { category: 'promql_answer_follow_up' },
  },
  {
    input: {
      turns: [
        `Using PromQL, show the network transmit throughput in bytes per second per instance over the last 2 hours. ${DATA_STREAM_HINT}`,
        'And the disk write throughput in bytes per second per instance, also with PromQL?',
      ],
    },
    output: {
      query: `${PROMQL_RANGE} written=(sum by (instance) (rate(node_disk_written_bytes_total)))`,
      sourceCommand: 'PROMQL',
      rules: RANGE_RULES,
    },
    metadata: { category: 'promql_answer_follow_up' },
  },
];

// Visualization queries may drop the PROMQL start and end options, as the chart applies its own time range.
const VISUALIZATION_RULES = [NO_FIXED_RANGE_SELECTOR, NO_HARDCODED_TIME];

const visualizationFollowUpExamples: FollowUpExample[] = [
  {
    input: {
      turns: [
        `Using PromQL, chart the 1-minute load average per instance over time. ${DATA_STREAM_HINT}`,
        'Now chart the network receive throughput in bytes per second per instance, also with PromQL.',
      ],
    },
    output: {
      query: `PROMQL index=${NODE_EXPORTER_INDEX} receive=(sum by (instance) (rate(node_network_receive_bytes_total)))`,
      sourceCommand: 'PROMQL',
      rules: VISUALIZATION_RULES,
    },
    metadata: { category: 'promql_visualization_follow_up' },
  },
  {
    input: {
      turns: [
        `Using PromQL, chart the CPU utilization in percent per instance over time. ${DATA_STREAM_HINT}`,
        'Also chart the disk read throughput in bytes per second per instance with PromQL.',
      ],
    },
    output: {
      query: `PROMQL index=${NODE_EXPORTER_INDEX} read=(sum by (instance) (rate(node_disk_read_bytes_total)))`,
      sourceCommand: 'PROMQL',
      rules: VISUALIZATION_RULES,
    },
    metadata: { category: 'promql_visualization_follow_up' },
  },
];

const EQUIVALENCE_INSTRUCTIONS = `The queries read Prometheus metrics from a TSDB data stream where \`labels\` and \`metrics\` are passthrough objects, so \`instance\` and \`labels.instance\` are the same field, as are \`node_load1\` and \`metrics.node_load1\`.
Judge whether both queries return the same values for each label group and time bucket. These differences don't affect equivalence:
- Column, alias and PROMQL expression names, such as \`cpu=\` versus \`cpu_utilization=\`.
- How a time span is written, such as \`5 minute\` versus \`5 minutes\`.
- Aggregations that don't change the values, such as \`sum by (instance)\`, \`max by (instance)\` or no aggregation over a metric with one series per instance.
- Time range filters, the PROMQL \`start\`, \`end\` and \`time\` options, and range selectors such as \`[5m]\`, which are checked separately.
- An index pattern that only adds a trailing \`*\` to the same data stream name, and a \`SORT\` that only changes the row order.
- Different formulas for the same quantity, as long as they agree on real data. For example, CPU utilization as \`1 - avg(rate(idle))\` or as \`sum(rate(non-idle)) / sum(rate(all))\` are equivalent, because the per-CPU rates of all modes sum to 1.
These differences do: another quantity or metric, another unit such as a ratio instead of a percent, missing or different label filters, and different grouping labels.
Decide the verdict only after reasoning, and make it consistent with the reasoning.`;

const extractQuery = (output: ToolTaskOutput): string => output.esql;

const evaluate = base.extend<{}, { nodeExporterTimeRange: NodeExporterTimeRange }>({
  nodeExporterTimeRange: [
    async ({ esClient, log }, use) => {
      const timeRange = await loadNodeExporterMetrics({ esClient, log });
      await use(timeRange);
      await cleanNodeExporterMetrics(esClient);
    },
    { scope: 'worker' },
  ],
});

evaluate.describe('PROMQL and TS query generation', { tag: tags.serverless.search }, () => {
  evaluate(
    'node_exporter metrics',
    async ({
      chatClient,
      executorClient,
      inferenceClient,
      evaluationConnector,
      esClient,
      log,
      nodeExporterTimeRange,
    }) => {
      const dataset = {
        name: 'esql: promql and ts queries',
        description:
          'PROMQL and TS queries generated by generate_esql over Prometheus node_exporter metrics',
        examples,
      } satisfies EvaluationDataset;

      const task: ExperimentTask<PromqlTsExample, ToolTaskOutput> = async ({ input }) => {
        if (!input) {
          throw new Error('Example has no input');
        }
        const { question, context } = input;
        const response = await chatClient.executeTool({
          toolId: platformCoreTools.generateEsql,
          toolParams: {
            query: question,
            index: NODE_EXPORTER_INDEX,
            time_range: nodeExporterTimeRange,
            ...(context ? { context } : {}),
          },
        });

        const esql = getToolResultQueries(
          (response.results as ToolResult[]).filter(({ type }) => type === 'query')
        ).join('\n');

        return { esql, results: response.results, errors: response.errors };
      };

      const runQuery = createEsqlQueryRunner({ esClient, timeRange: nodeExporterTimeRange });

      await executorClient.runExperiment({ datasets: [dataset], task }, [
        createSourceCommandEvaluator({ extractQuery }),
        ...createEsqlExecutionEvaluators({ extractQuery, runQuery }),
        createQueryRulesEvaluator({ extractQuery }),
        createEsqlEquivalenceEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          log,
          predictionExtractor: (output) => (output as ToolTaskOutput).esql ?? '',
          groundTruthExtractor: (expected) => (expected as EsqlQueryExpectation).query,
          instructions: EQUIVALENCE_INSTRUCTIONS,
        }),
      ]);
    }
  );

  evaluate(
    'node_exporter follow-up queries',
    async ({ chatClient, executorClient, esClient, nodeExporterTimeRange }) => {
      const task: ExperimentTask<FollowUpExample, FollowUpTaskOutput> = async ({ input }) => {
        if (!input) {
          throw new Error('Example has no input');
        }
        const [firstQuestion, secondQuestion] = input.turns;
        const firstTurn = await chatClient.converse({
          messages: [{ message: firstQuestion }],
          options: { autoConfirm: true },
        });
        // Without the first answer, the second question would start a new conversation.
        if (firstTurn.errors.length > 0 || !firstTurn.conversationId) {
          return {
            generated: [],
            provided: [],
            conversationGenerated: [],
            messages: firstTurn.messages,
            errors: firstTurn.errors,
          };
        }
        const secondTurn = await chatClient.converse({
          messages: [{ message: secondQuestion }],
          conversationId: firstTurn.conversationId,
          options: { autoConfirm: true },
        });

        const secondTurnQueries = getTurnQueries(secondTurn.steps ?? []);
        return {
          ...secondTurnQueries,
          conversationGenerated: [
            ...getTurnQueries(firstTurn.steps ?? []).generated,
            ...secondTurnQueries.generated,
          ],
          messages: secondTurn.messages,
          errors: [...firstTurn.errors, ...secondTurn.errors],
        };
      };

      const extractFollowUpQuery = (output: FollowUpTaskOutput): string => output.answer ?? '';
      const generatedQueriesOnly = createGeneratedQueriesOnlyEvaluator<
        FollowUpExample,
        FollowUpTaskOutput
      >({
        getQueries: ({ conversationGenerated, provided, answer }) => ({
          generated: conversationGenerated,
          provided,
          answer,
        }),
      });
      const followUpEvaluators = [
        generatedQueriesOnly,
        createSourceCommandEvaluator({ extractQuery: extractFollowUpQuery }),
        createQueryRulesEvaluator({ extractQuery: extractFollowUpQuery }),
      ];

      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'esql: promql follow-up answers',
              description:
                'Second PROMQL question in a conversation, answered with a query run in the chat',
              examples: answerFollowUpExamples,
            } satisfies EvaluationDataset,
          ],
          task,
        },
        [
          ...followUpEvaluators,
          ...createEsqlExecutionEvaluators({
            extractQuery: extractFollowUpQuery,
            runQuery: createEsqlQueryRunner({ esClient, timeRange: nodeExporterTimeRange }),
          }),
        ]
      );

      // Visualization queries rely on the chart's time range, so they are not run here.
      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'esql: promql follow-up visualizations',
              description: 'Second PROMQL chart in a conversation',
              examples: visualizationFollowUpExamples,
            } satisfies EvaluationDataset,
          ],
          task,
        },
        followUpEvaluators
      );
    }
  );
});
