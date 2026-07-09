/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import type { StorageClientBulkOperation } from '@kbn/storage-adapter';
import {
  CONVERSATION_FEASIBILITY_CORPUS,
  CONVERSATION_FEASIBILITY_LOCAL_TARGETS,
  runConversationFeasibilityBenchmark,
  type ConversationFeasibilityBenchmarkResult,
  type ConversationFeasibilityCorpus,
} from '../server/services/conversation/client/feasibility_benchmark';
import type { ConversationProperties } from '../server/services/conversation/client/storage';

const parsePositiveIntegerEnv = (name: string, defaultValue: number): number => {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, received "${rawValue}"`);
  }

  return value;
};

const node = process.env.ES_NODE ?? CONVERSATION_FEASIBILITY_LOCAL_TARGETS.elasticsearchUrls[0];
const username =
  process.env.ES_USERNAME ?? CONVERSATION_FEASIBILITY_LOCAL_TARGETS.elasticsearchUsername;
const password =
  process.env.ES_PASSWORD ?? CONVERSATION_FEASIBILITY_LOCAL_TARGETS.elasticsearchPassword;
const index = process.env.BENCHMARK_INDEX ?? 'agent-builder-conversation-feasibility';
const iterations = parsePositiveIntegerEnv('BENCHMARK_ITERATIONS', 10);
const corpus: ConversationFeasibilityCorpus = {
  conversationCount: parsePositiveIntegerEnv(
    'BENCHMARK_CONVERSATIONS',
    CONVERSATION_FEASIBILITY_CORPUS.conversationCount
  ),
  roundsPerConversation: parsePositiveIntegerEnv(
    'BENCHMARK_ROUNDS_PER_CONVERSATION',
    CONVERSATION_FEASIBILITY_CORPUS.roundsPerConversation
  ),
  toolCallsPerConversation: parsePositiveIntegerEnv(
    'BENCHMARK_TOOL_CALLS_PER_CONVERSATION',
    CONVERSATION_FEASIBILITY_CORPUS.toolCallsPerConversation
  ),
  p95ThresholdMs: parsePositiveIntegerEnv(
    'BENCHMARK_P95_LIMIT_MS',
    CONVERSATION_FEASIBILITY_CORPUS.p95ThresholdMs
  ),
};
const idPrefix = 'benchmark-conversation';
const seedBatchSize = parsePositiveIntegerEnv('BENCHMARK_SEED_BATCH_SIZE', 50);

const es = new Client({
  node,
  auth: { username, password },
});

const writeStdout = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const writeStderr = (message: string) => {
  process.stderr.write(`${message}\n`);
};

const colorBenchmarkMessage = (message: string): string => {
  if (message.startsWith('Seeding')) {
    return chalk.cyan(`[benchmark] ${message}`);
  }

  if (message.startsWith('Starting search benchmark')) {
    return chalk.blue(`[benchmark] ${message}`);
  }

  if (message.includes('PASS')) {
    return chalk.green(`[benchmark] ${message.replace('PASS', chalk.bold.green('PASS'))}`);
  }

  if (message.includes('FAIL')) {
    return chalk.red(`[benchmark] ${message.replace('FAIL', chalk.bold.red('FAIL'))}`);
  }

  return chalk.dim(`[benchmark] ${message}`);
};

const padAnsi = (value: string, width: number): string => {
  return value + ' '.repeat(Math.max(width - stripAnsi(value).length, 0));
};

const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
};

const formatPassPercentage = (results: ConversationFeasibilityBenchmarkResult[]): string => {
  if (results.length === 0) {
    return chalk.red('0/0 (0.0%)');
  }

  const passedCount = results.filter((result) => result.passed).length;
  const passPercentage = (passedCount / results.length) * 100;
  const formatted = `${passedCount}/${results.length} (${passPercentage.toFixed(1)}%)`;

  return passedCount === results.length ? chalk.green(formatted) : chalk.red(formatted);
};

const formatThresholdExceededPercentage = ({
  passed,
  p95ThresholdExceededPercentage,
}: ConversationFeasibilityBenchmarkResult): string => {
  if (p95ThresholdExceededPercentage === 0) {
    return '-';
  }

  const formatted = `+${p95ThresholdExceededPercentage.toFixed(1)}%`;

  return passed ? chalk.yellow(formatted) : chalk.red(formatted);
};

const formatResultTable = ({
  results,
  elapsedMs,
}: {
  results: ConversationFeasibilityBenchmarkResult[];
  elapsedMs: number;
}): string => {
  const headers = ['Search benchmark', 'p50', 'p95', 'Over limit', 'max', 'ES p95', 'Result'];
  const rows = results.map((result) => {
    const esP95 =
      result.esTookMs.length > 0
        ? [...result.esTookMs].sort((a, b) => a - b)[
            Math.min(result.esTookMs.length - 1, Math.ceil(result.esTookMs.length * 0.95) - 1)
          ]
        : undefined;

    return [
      result.name,
      `${result.p50Ms}ms`,
      result.passed ? chalk.green(`${result.p95Ms}ms`) : chalk.red(`${result.p95Ms}ms`),
      formatThresholdExceededPercentage(result),
      `${result.maxMs}ms`,
      esP95 !== undefined ? `${esP95}ms` : '-',
      result.passed ? chalk.bold.green('PASS') : chalk.bold.red('FAIL'),
    ];
  });

  const widths = headers.map((header, columnIndex) =>
    Math.max(header.length, ...rows.map((row) => stripAnsi(row[columnIndex]).length))
  );
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const header = headers
    .map((cell, columnIndex) => chalk.bold(padAnsi(cell, widths[columnIndex])))
    .join('  ');
  const body = rows
    .map((row) => row.map((cell, columnIndex) => padAnsi(cell, widths[columnIndex])).join('  '))
    .join('\n');

  return [
    '',
    chalk.bold('Conversation feasibility benchmark'),
    `${chalk.dim('Elasticsearch:')} ${node}`,
    `${chalk.dim('Index:')} ${index}`,
    `${chalk.dim('Corpus:')} ${corpus.conversationCount} conversations, ${
      corpus.roundsPerConversation
    } rounds, ${corpus.toolCallsPerConversation} tool calls`,
    `${chalk.dim('P95 limit:')} ${corpus.p95ThresholdMs}ms`,
    `${chalk.dim('Iterations:')} ${iterations}`,
    `${chalk.dim('Seed batch size:')} ${seedBatchSize}`,
    `${chalk.dim('Pass rate:')} ${formatPassPercentage(results)}`,
    `${chalk.dim('Elapsed:')} ${formatDuration(elapsedMs)}`,
    '',
    header,
    chalk.dim(separator),
    body,
  ].join('\n');
};

const mappings = {
  dynamic: false,
  properties: {
    user_id: { type: 'keyword' },
    user_name: { type: 'keyword' },
    agent_id: { type: 'keyword' },
    space: { type: 'keyword' },
    title: { type: 'text' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    template: {
      type: 'object',
      dynamic: false,
      properties: {
        id: { type: 'keyword' },
        version: { type: 'long' },
      },
    },
    extended_fields: { type: 'flattened' },
    conversation_rounds: { type: 'object', dynamic: false, properties: {} },
    attachments: { type: 'object', dynamic: false, properties: {} },
    state: { type: 'object', dynamic: false, properties: {} },
    status: { type: 'keyword' },
    read: { type: 'boolean' },
    workspace_id: { type: 'keyword' },
    access_control: {
      type: 'object',
      dynamic: false,
      properties: {
        access_mode: { type: 'keyword' },
      },
    },
    source: {
      type: 'object',
      dynamic: false,
      properties: {
        type: { type: 'keyword' },
        external_conversation_id: { type: 'keyword' },
      },
    },
  },
};

const client = {
  async bulk({
    operations,
    refresh,
  }: {
    operations: Array<StorageClientBulkOperation<ConversationProperties>>;
    refresh: 'wait_for';
    throwOnFail: true;
  }) {
    const esOperations = operations.flatMap((operation) => {
      if (!('index' in operation)) {
        throw new Error('Benchmark runner only supports index operations');
      }

      return [{ index: { _index: index, _id: operation.index._id } }, operation.index.document];
    });

    return await es.bulk({
      operations: esOperations,
      refresh,
    });
  },
  async search(request: Record<string, unknown>) {
    return await es.search({
      index,
      ...request,
    });
  },
};

async function main() {
  const indexExists = await es.indices.exists({ index });
  if (indexExists) {
    await es.deleteByQuery({
      index,
      conflicts: 'proceed',
      refresh: true,
      query: { match_all: {} },
    });
  } else {
    await es.indices.create({
      index,
      mappings,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });
  }

  const startedAt = Date.now();
  const results = await runConversationFeasibilityBenchmark({
    client,
    iterations,
    corpus,
    idPrefix,
    seedBatchSize,
    logger: (message) => writeStdout(colorBenchmarkMessage(message)),
  });
  const elapsedMs = Date.now() - startedAt;

  writeStdout(formatResultTable({ results, elapsedMs }));
}

main().catch((error) => {
  writeStderr(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
