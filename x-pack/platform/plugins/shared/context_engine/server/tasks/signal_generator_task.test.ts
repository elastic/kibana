/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  MANAGEMENT_AGENT_ID,
  SIGNAL_GENERATOR_TASK_ID,
  SIGNAL_GENERATOR_TASK_TYPE,
} from '../../common/constants';
import type { Signal } from '../../common/http_api/signals';
import type { SignalsServiceApi } from '../signals/service';
import {
  registerSignalGeneratorTaskDefinition,
  scheduleSignalGenerator,
} from './signal_generator_task';
import { buildConvAgentMap, spaceFromTracesIndex } from './traces_repository';

describe('spaceFromTracesIndex', () => {
  it('derives space from the data-stream name', () => {
    expect(spaceFromTracesIndex('traces-agent_builder.otel-default')).toBe('default');
    expect(spaceFromTracesIndex('traces-agent_builder.otel-marketing')).toBe('marketing');
  });

  it('derives space from a backing index (strips .ds- and the generation suffix)', () => {
    expect(spaceFromTracesIndex('.ds-traces-agent_builder.otel-default-2026.08.10-000001')).toBe(
      'default'
    );
  });

  it('preserves hyphens inside the space id', () => {
    expect(spaceFromTracesIndex('traces-agent_builder.otel-test-space')).toBe('test-space');
    expect(spaceFromTracesIndex('.ds-traces-agent_builder.otel-test-space-2026.08.10-000001')).toBe(
      'test-space'
    );
  });

  it('returns undefined for anything that is not a traces index', () => {
    expect(spaceFromTracesIndex('logs-generic-default')).toBeUndefined();
    expect(spaceFromTracesIndex('')).toBeUndefined();
    expect(spaceFromTracesIndex(undefined)).toBeUndefined();
    expect(spaceFromTracesIndex(null)).toBeUndefined();
  });
});

describe('buildConvAgentMap', () => {
  it('flags the management agent by id, not by display name', () => {
    const map = buildConvAgentMap([
      {
        trace_id: 'trace-1',
        'attributes.gen_ai.conversation.id': 'conv-1',
        'attributes.gen_ai.agent.id': MANAGEMENT_AGENT_ID,
        'attributes.gen_ai.agent.name': 'Context Engine',
      },
      {
        trace_id: 'trace-2',
        'attributes.gen_ai.conversation.id': 'conv-2',
        // A user agent that happens to share the management display name.
        'attributes.gen_ai.agent.id': 'user-agent-9',
        'attributes.gen_ai.agent.name': 'Context Engine',
      },
    ]);

    expect(map.get('trace-1')?.class).toBe('management');
    expect(map.get('trace-2')?.class).toBe('user');
  });

  it('keeps only the first invoke_agent span per round', () => {
    const map = buildConvAgentMap([
      { trace_id: 'trace-1', 'attributes.gen_ai.agent.id': 'agent-a' },
      { trace_id: 'trace-1', 'attributes.gen_ai.agent.id': 'agent-b' },
    ]);
    expect(map.get('trace-1')?.id).toBe('agent-a');
  });
});

// --- helpers for the task runner tests ------------------------------------

type EsqlRow = Record<string, unknown>;

interface EsqlQueryArgs {
  query: string;
  params?: Array<string | Record<string, string>>;
}

const esqlResponse = (columns: string[], rows: EsqlRow[]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values: rows.map((row) => columns.map((name) => row[name] ?? null)),
});

const TOOL_COLUMNS = [
  '_index',
  '@timestamp',
  'trace_id',
  'span_id',
  'attributes.gen_ai.tool.name',
  'attributes.gen_ai.tool.call.id',
  'attributes.gen_ai.tool.call.arguments',
  'attributes.gen_ai.tool.call.result',
  'duration',
  'status.code',
  'status.message',
];

const AGENT_COLUMNS = [
  'trace_id',
  'attributes.gen_ai.conversation.id',
  'attributes.gen_ai.agent.id',
  'attributes.gen_ai.agent.name',
];

const toolRow = (overrides: Partial<EsqlRow> = {}): EsqlRow => ({
  _index: '.ds-traces-agent_builder.otel-default-2026.08.10-000001',
  '@timestamp': '2026-07-08T12:10:30.000Z',
  trace_id: 'trace-1',
  span_id: 'span-1',
  'attributes.gen_ai.tool.name': 'platform.core.execute_esql',
  'attributes.gen_ai.tool.call.id': 'call-1',
  'attributes.gen_ai.tool.call.arguments': JSON.stringify({ query: 'FROM logs-* | LIMIT 10' }),
  'attributes.gen_ai.tool.call.result': JSON.stringify({ columns: ['message'], values: [] }),
  duration: 5_000_000,
  'status.code': 'Ok',
  'status.message': null,
  ...overrides,
});

// The mock is watermark-aware for execute_tool (`>=` filter on the param) and
// trace_id-aware for invoke_agent (returns only rows for requested trace_ids),
// so idempotency/boundary and management-round behavior are actually exercised.
const createEsClient = (toolRows: EsqlRow[], agentRows: EsqlRow[]): ElasticsearchClient => {
  const query = jest.fn(async ({ query: q, params }: EsqlQueryArgs) => {
    if (q.includes('execute_tool')) {
      const watermark =
        q.includes('?watermark') && params?.[0] && typeof params[0] === 'object'
          ? params[0].watermark
          : undefined;
      const filtered = watermark
        ? toolRows.filter((row) => String(row['@timestamp']) >= watermark)
        : toolRows;
      return esqlResponse(TOOL_COLUMNS, filtered);
    }
    if (q.includes('invoke_agent')) {
      const requested = new Set((params ?? []).map((param) => String(param)));
      const filtered = agentRows.filter((row) => requested.has(String(row.trace_id)));
      return esqlResponse(AGENT_COLUMNS, filtered);
    }
    return esqlResponse([], []);
  });
  return { esql: { query } } as unknown as ElasticsearchClient;
};

const createSignalsService = () => {
  const writes: Array<{ spaceId: string; signals: Signal[] }> = [];
  const service: SignalsServiceApi = {
    ensureIndex: jest.fn(async () => {}),
    write: jest.fn(async (spaceId: string, signals: Signal[]) => {
      writes.push({ spaceId, signals });
    }),
  };
  return { service, writes };
};

interface TaskRunner {
  run: () => Promise<{ state: Record<string, unknown> }>;
}
interface TaskDefinition {
  createTaskRunner: (context: {
    taskInstance: { state: Record<string, unknown> };
    signal: AbortSignal;
  }) => TaskRunner;
}

const registerRunner = (deps: {
  esClient: ElasticsearchClient;
  signalsService: SignalsServiceApi;
  enabled: boolean;
  logger: Logger;
}): TaskDefinition => {
  let definition: TaskDefinition | undefined;
  const taskManager = {
    registerTaskDefinitions: (defs: Record<string, TaskDefinition>) => {
      definition = defs[SIGNAL_GENERATOR_TASK_TYPE];
    },
  } as unknown as TaskManagerSetupContract;

  registerSignalGeneratorTaskDefinition({
    taskManager,
    getEsClient: () => deps.esClient,
    getSignalsService: () => deps.signalsService,
    getFeedbackLoopEnabled: async () => deps.enabled,
    logger: deps.logger,
  });

  if (!definition) {
    throw new Error('task definition was not registered');
  }
  return definition;
};

describe('signal generator task run()', () => {
  const run = async (opts: {
    toolRows: EsqlRow[];
    agentRows: EsqlRow[];
    enabled?: boolean;
    state?: Record<string, unknown>;
    signal?: AbortSignal;
    service?: SignalsServiceApi;
    writes?: Array<{ spaceId: string; signals: Signal[] }>;
    logger?: Logger;
  }) => {
    const esClient = createEsClient(opts.toolRows, opts.agentRows);
    const built =
      opts.service && opts.writes
        ? { service: opts.service, writes: opts.writes }
        : createSignalsService();
    const logger = opts.logger ?? loggingSystemMock.createLogger();
    const definition = registerRunner({
      esClient,
      signalsService: built.service,
      enabled: opts.enabled ?? true,
      logger,
    });

    const runner = definition.createTaskRunner({
      taskInstance: { state: opts.state ?? {} },
      signal: opts.signal ?? new AbortController().signal,
    });
    const result = await runner.run();
    return { result, writes: built.writes, service: built.service, esClient, logger };
  };

  it('registers a single global task type', async () => {
    const { result } = await run({ toolRows: [], agentRows: [] });
    expect(result.state).toEqual({});
  });

  it('no-ops (no read, no write) when the feedback loop is disabled', async () => {
    const { result, writes, esClient } = await run({
      toolRows: [toolRow()],
      agentRows: [],
      enabled: false,
      state: { watermark: 'prev' },
    });

    expect(result.state).toEqual({ watermark: 'prev' });
    expect((esClient.esql.query as jest.Mock).mock.calls).toHaveLength(0);
    expect(writes).toHaveLength(0);
  });

  it('builds + classifies + writes signals to the originating space and advances the watermark', async () => {
    const { result, writes } = await run({
      toolRows: [
        toolRow({
          span_id: 'span-1',
          '@timestamp': '2026-07-08T12:10:30.000Z',
          'attributes.gen_ai.tool.call.result': JSON.stringify({
            columns: ['message'],
            values: [],
          }),
        }),
        toolRow({
          span_id: 'span-2',
          '@timestamp': '2026-07-08T12:11:00.000Z',
          'status.code': 'Error',
          'status.message': 'boom',
        }),
      ],
      agentRows: [
        {
          trace_id: 'trace-1',
          'attributes.gen_ai.conversation.id': 'conv-1',
          'attributes.gen_ai.agent.id': 'agent-1',
          'attributes.gen_ai.agent.name': 'support',
        },
      ],
    });

    expect(writes).toHaveLength(1);
    expect(writes[0].spaceId).toBe('default');
    expect(writes[0].signals).toHaveLength(2);

    const byId = new Map(writes[0].signals.map((s) => [s.signal_id, s]));
    // Raw-access + empty retrieval → two tags on span-1.
    expect(byId.get('trace-1:span-1')?.tags.slice().sort()).toEqual([
      'coverage_gap',
      'empty_retrieval',
    ]);
    // Error span → query_error (plus coverage_gap for raw access).
    expect(byId.get('trace-1:span-2')?.tags).toContain('query_error');

    expect(result.state).toEqual({ watermark: '2026-07-08T12:11:00.000Z' });
  });

  it('groups signals per space, writing each space separately', async () => {
    const { writes } = await run({
      toolRows: [
        toolRow({
          _index: '.ds-traces-agent_builder.otel-default-2026.08.10-000001',
          trace_id: 'trace-1',
          span_id: 'span-1',
        }),
        toolRow({
          _index: '.ds-traces-agent_builder.otel-marketing-2026.08.10-000001',
          trace_id: 'trace-2',
          span_id: 'span-1',
        }),
      ],
      agentRows: [],
    });

    const spaces = writes.map((w) => w.spaceId).sort();
    expect(spaces).toEqual(['default', 'marketing']);
  });

  it('never calls ensureIndex before writing (write bootstraps the index itself)', async () => {
    const { service } = await run({ toolRows: [toolRow()], agentRows: [] });
    expect(service.ensureIndex).not.toHaveBeenCalled();
    expect(service.write).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: re-running over the same span re-reads the `>=` watermark boundary', async () => {
    const rows = [toolRow({ span_id: 'span-1' })];
    const first = await run({ toolRows: rows, agentRows: [] });
    const second = await run({
      toolRows: rows,
      agentRows: [],
      state: first.result.state as Record<string, unknown>,
    });

    // The advanced watermark equals the span's timestamp; the `>=` filter must
    // still return the boundary span on the next run (idempotent overwrite).
    expect(first.writes[0].signals[0].signal_id).toBe('trace-1:span-1');
    expect(second.writes).toHaveLength(1);
    expect(second.writes[0].signals[0].signal_id).toBe('trace-1:span-1');
  });

  it('does not throw and emits no signal when a span carries a non-string query', async () => {
    const { result, writes } = await run({
      toolRows: [
        toolRow({
          span_id: 'span-1',
          'attributes.gen_ai.tool.call.arguments': JSON.stringify({ query: { nested: true } }),
        }),
      ],
      agentRows: [],
    });

    // A non-string query resolves to query_kind "other" and is filtered out — no signal emitted.
    expect(writes.flatMap((w) => w.signals)).toHaveLength(0);
    expect(result.state).toEqual({ watermark: '2026-07-08T12:10:30.000Z' });
  });

  it('resolves invoke_agent by trace_id, so a management round is excluded even when its tool spans are the only batch', async () => {
    const { writes, esClient } = await run({
      toolRows: [toolRow({ trace_id: 'trace-mgmt', span_id: 'span-1' })],
      agentRows: [
        {
          trace_id: 'trace-mgmt',
          'attributes.gen_ai.conversation.id': 'conv-mgmt',
          'attributes.gen_ai.agent.id': MANAGEMENT_AGENT_ID,
          'attributes.gen_ai.agent.name': 'Context Engine',
        },
      ],
      state: { watermark: '2026-01-01T00:00:00.000Z' },
    });

    const [signal] = writes[0].signals;
    expect(signal.data.agent.class).toBe('management');
    expect(signal.tags).toEqual([]);

    // The invoke_agent query is parameterized by the batch's trace_ids.
    const invokeCall = (esClient.esql.query as jest.Mock).mock.calls.find(([arg]) =>
      arg.query.includes('invoke_agent')
    );
    expect(invokeCall?.[0].params).toEqual(['trace-mgmt']);
  });

  it('reads only execute_esql tool spans (filters non-ES|QL tools at read-time)', async () => {
    const { esClient } = await run({ toolRows: [toolRow()], agentRows: [] });

    const toolCall = (esClient.esql.query as jest.Mock).mock.calls.find(([arg]) =>
      arg.query.includes('execute_tool')
    );
    expect(toolCall?.[0].query).toContain(
      'attributes.gen_ai.tool.name == "platform.core.execute_esql"'
    );
  });

  it('keeps the watermark unchanged when the batch is aborted mid-loop', async () => {
    const controller = new AbortController();
    const writes: Array<{ spaceId: string; signals: Signal[] }> = [];
    const service: SignalsServiceApi = {
      ensureIndex: jest.fn(async () => {}),
      write: jest.fn(async (spaceId: string, signals: Signal[]) => {
        writes.push({ spaceId, signals });
        controller.abort();
      }),
    };

    const { result } = await run({
      toolRows: [
        toolRow({
          _index: '.ds-traces-agent_builder.otel-default-2026.08.10-000001',
          trace_id: 'trace-1',
          span_id: 'span-1',
        }),
        toolRow({
          _index: '.ds-traces-agent_builder.otel-marketing-2026.08.10-000001',
          trace_id: 'trace-2',
          span_id: 'span-1',
        }),
      ],
      agentRows: [],
      state: { watermark: '2026-01-01T00:00:00.000Z' },
      signal: controller.signal,
      service,
      writes,
    });

    // First space written, then aborted before the second → watermark held.
    expect(writes).toHaveLength(1);
    expect(result.state).toEqual({ watermark: '2026-01-01T00:00:00.000Z' });
  });

  it('does not advance the watermark and still attempts other spaces when one space write rejects', async () => {
    const writes: Array<{ spaceId: string; signals: Signal[] }> = [];
    const service: SignalsServiceApi = {
      ensureIndex: jest.fn(async () => {}),
      write: jest.fn(async (spaceId: string, signals: Signal[]) => {
        if (spaceId === 'default') {
          throw new Error('boom');
        }
        writes.push({ spaceId, signals });
      }),
    };

    const { result } = await run({
      toolRows: [
        toolRow({
          _index: '.ds-traces-agent_builder.otel-default-2026.08.10-000001',
          trace_id: 'trace-1',
          span_id: 'span-1',
        }),
        toolRow({
          _index: '.ds-traces-agent_builder.otel-marketing-2026.08.10-000001',
          trace_id: 'trace-2',
          span_id: 'span-1',
        }),
      ],
      agentRows: [],
      state: { watermark: '2026-01-01T00:00:00.000Z' },
      service,
      writes,
    });

    // The good space is still written; the failed space holds the watermark.
    expect(service.write).toHaveBeenCalledTimes(2);
    expect(writes.map((w) => w.spaceId)).toEqual(['marketing']);
    expect(result.state).toEqual({ watermark: '2026-01-01T00:00:00.000Z' });
  });

  it('warns when the per-run read cap is hit', async () => {
    const logger = loggingSystemMock.createLogger();
    const toolRows = Array.from({ length: 1000 }, (_, i) =>
      toolRow({ span_id: `span-${i}`, '@timestamp': '2026-07-08T12:10:30.000Z' })
    );
    await run({ toolRows, agentRows: [], logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('per-run cap'));
  });
});

describe('scheduling', () => {
  const createTaskManagerStart = () =>
    ({
      ensureScheduled: jest.fn(async () => ({})),
      removeIfExists: jest.fn(async () => ({})),
    } as unknown as TaskManagerStartContract);

  it('schedules the task with the fixed id/type/interval', async () => {
    const taskManager = createTaskManagerStart();
    await scheduleSignalGenerator({ taskManager });
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SIGNAL_GENERATOR_TASK_ID,
        taskType: SIGNAL_GENERATOR_TASK_TYPE,
        schedule: { interval: '1h' },
      })
    );
  });
});
