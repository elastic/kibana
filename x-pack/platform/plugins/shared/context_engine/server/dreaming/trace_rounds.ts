/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, mutate } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexTraceWithQuery } from '../../common/http_api/ai_indices';
import type {
  ReadTraceTranscriptsOutput,
  TraceTranscriptMemory,
} from '../../common/step_types/read_trace_transcripts';
import { formatErrorMessage } from '../utils/format_es_error';
import { TRACE_ROUND_ID_PREFIX } from './ids';
import { buildRoundTranscript } from './trace_transcripts';

/** The memory type of a round read from traces, as the dreaming model and the apply step see it. */
export const TRACE_ROUND_TYPE = 'trace.round';

/** Rounds whose spans are loaded per search: each last `chat` span holds a whole conversation. */
const SPAN_LOAD_BATCH = 10;

const OPERATION_FIELD = 'attributes.gen_ai.operation.name';
const INPUT_MESSAGES_FIELD = 'attributes.gen_ai.input.messages';
const OUTPUT_MESSAGES_FIELD = 'attributes.gen_ai.output.messages';
const AGENT_ID_FIELD = 'attributes.gen_ai.agent.id';
const AGENT_NAME_FIELD = 'attributes.gen_ai.agent.name';
const CONVERSATION_ID_FIELD = 'attributes.gen_ai.conversation.id';
const CONVERSATION_TITLE_FIELD = 'attributes.elastic.conversation.title';

/** A round a trace source found: one trace, and when its last span ended. */
export interface TraceRound {
  traceId: string;
  lastAt: string;
  /** The index expression of the source's `FROM`, where the round's spans are. */
  target: string;
}

const compareRounds = (a: Pick<TraceRound, 'lastAt' | 'traceId'>, b: typeof a): number =>
  Date.parse(a.lastAt) - Date.parse(b.lastAt) ||
  (a.traceId < b.traceId ? -1 : a.traceId > b.traceId ? 1 : 0);

/** The index expression a trace source query reads from. */
export const targetOfTraceQuery = (query: string): string => {
  const { root, errors } = Parser.parse(query);
  const sources = errors.length === 0 ? [...mutate.commands.from.sources.list(root)] : [];
  const names = sources.map((source) => source.index?.valueUnquoted ?? source.name).filter(Boolean);
  if (names.length === 0) {
    throw new Error('The trace source query has no FROM to read spans from.');
  }
  return names.join(',');
};

/** How long before the cursor a round may have started and still end after it. */
export const ROUND_LOOKBACK_MS = 60 * 60 * 1000;

/** A span ends `duration` nanoseconds after it starts; spans are exported when they end. */
const SPAN_END = 'TO_DATETIME(TO_LONG(@timestamp) + duration / 1000000)';

const isUnknownDurationError = (error: unknown): boolean =>
  /unknown column \[duration\]/i.test(formatErrorMessage(error));

/**
 * The rounds a trace source query finds that ended after the cursor and no later than `until`.
 * A round ends with the last span the query selects, so a round still running at `until` is left
 * for the next read rather than read half done. Spans without a `duration`, from a source that does
 * not keep it, end when they start.
 */
export const findTraceRounds = async ({
  esClient,
  query,
  since,
  after,
  until,
  size,
}: {
  esClient: ElasticsearchClient;
  query: string;
  since: string;
  after: string;
  until: string;
  size: number;
}): Promise<TraceRound[]> => {
  const target = targetOfTraceQuery(query);
  const lookback = new Date(Date.parse(since) - ROUND_LOOKBACK_MS).toISOString();
  const run = (spanEnd: string) =>
    esClient.esql.query({
      query: [
        query,
        '| WHERE @timestamp >= TO_DATETIME(?lookback)',
        `| EVAL ended_at = ${spanEnd}`,
        '| STATS last_at = MAX(ended_at) BY trace_id',
        '| WHERE last_at <= TO_DATETIME(?until)',
        '| WHERE last_at > TO_DATETIME(?since) OR (last_at == TO_DATETIME(?since) AND trace_id > ?after)',
        '| SORT last_at ASC, trace_id ASC',
        `| LIMIT ${size}`,
      ].join('\n'),
      params: [{ lookback }, { until }, { since }, { after }],
    });
  let response;
  try {
    response = await run(`COALESCE(${SPAN_END}, @timestamp)`);
  } catch (error) {
    if (!isUnknownDurationError(error)) {
      throw error;
    }
    response = await run('@timestamp');
  }
  const { columns, values } = response;
  const traceIdColumn = columns.findIndex(({ name }) => name === 'trace_id');
  const lastAtColumn = columns.findIndex(({ name }) => name === 'last_at');
  return values.flatMap((row) => {
    const traceId = row[traceIdColumn];
    const lastAt = row[lastAtColumn];
    return typeof traceId === 'string' && typeof lastAt === 'string'
      ? [{ traceId, lastAt, target }]
      : [];
  });
};

/** A value from `_source`, whether it stores the dotted path flat, nested, or mixed. */
export const valueAt = (source: unknown, path: string): unknown => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (path in record) {
    return record[path];
  }
  const segments = path.split('.');
  for (let i = 1; i < segments.length; i++) {
    const head = segments.slice(0, i).join('.');
    if (head in record) {
      const found = valueAt(record[head], segments.slice(i).join('.'));
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

interface LoadedRound {
  inputMessages?: unknown;
  outputMessages?: unknown;
  agentId?: string;
  agentName?: string;
  conversationId?: string;
  conversationTitle?: string;
}

/** The latest span of an operation in each round, one search per batch of rounds. */
const latestSpanPerRound = async (
  esClient: ElasticsearchClient,
  target: string,
  traceIds: string[],
  operation: 'chat' | 'invoke_agent',
  fields: string[]
): Promise<Map<string, unknown>> => {
  const response = await esClient.search({
    index: target,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: traceIds.length,
    query: {
      bool: {
        filter: [{ terms: { trace_id: traceIds } }, { term: { [OPERATION_FIELD]: operation } }],
      },
    },
    collapse: { field: 'trace_id' },
    sort: [{ '@timestamp': { order: 'desc' } }],
    _source: ['trace_id', ...fields],
  });
  return new Map(
    response.hits.hits.flatMap((hit) => {
      const traceId = asString(valueAt(hit._source, 'trace_id'));
      return traceId ? [[traceId, hit._source] as const] : [];
    })
  );
};

/** Loads the spans a transcript is built from: each round's last `chat` span and its agent span. */
export const loadTraceRounds = async (
  esClient: ElasticsearchClient,
  target: string,
  traceIds: string[]
): Promise<Map<string, LoadedRound>> => {
  const loaded = new Map<string, LoadedRound>();
  for (let start = 0; start < traceIds.length; start += SPAN_LOAD_BATCH) {
    const batch = traceIds.slice(start, start + SPAN_LOAD_BATCH);
    const [chats, agents] = await Promise.all([
      latestSpanPerRound(esClient, target, batch, 'chat', [
        INPUT_MESSAGES_FIELD,
        OUTPUT_MESSAGES_FIELD,
      ]),
      latestSpanPerRound(esClient, target, batch, 'invoke_agent', [
        AGENT_ID_FIELD,
        AGENT_NAME_FIELD,
        CONVERSATION_ID_FIELD,
        CONVERSATION_TITLE_FIELD,
      ]),
    ]);
    for (const traceId of batch) {
      const chat = chats.get(traceId);
      const agent = agents.get(traceId);
      const round: LoadedRound = {
        ...(chat !== undefined && {
          inputMessages: valueAt(chat, INPUT_MESSAGES_FIELD),
          outputMessages: valueAt(chat, OUTPUT_MESSAGES_FIELD),
        }),
      };
      for (const [key, field] of [
        ['agentId', AGENT_ID_FIELD],
        ['agentName', AGENT_NAME_FIELD],
        ['conversationId', CONVERSATION_ID_FIELD],
        ['conversationTitle', CONVERSATION_TITLE_FIELD],
      ] as const) {
        const value = asString(valueAt(agent, field));
        if (value !== undefined) {
          round[key] = value;
        }
      }
      loaded.set(traceId, round);
    }
  }
  return loaded;
};

const toMemory = (
  { traceId, lastAt }: TraceRound,
  round: LoadedRound,
  transcript: string,
  spaceId: string
): TraceTranscriptMemory => ({
  id: `${TRACE_ROUND_ID_PREFIX}${traceId}`,
  type: TRACE_ROUND_TYPE,
  title: `${round.conversationTitle ?? 'Agent conversation'}${
    round.agentName ? ` with ${round.agentName}` : ''
  }, round ending ${lastAt}`,
  content: transcript,
  updated_at: lastAt,
  attributes: {
    'trace.id': traceId,
    ...(round.conversationId !== undefined && { 'trace.conversation_id': round.conversationId }),
    ...(round.agentId !== undefined && { 'trace.agent_id': round.agentId }),
  },
  permissions: { kibana: { privileges: [{ space: spaceId }] } },
});

/**
 * Reads the rounds every trace source of an AI index found since the cursor, oldest first, as
 * transcripts. A source that hit `size` may hold more rounds than it returned, so the read stops at
 * the earliest such boundary, and the cursor moves only as far as what was read. A source that fails
 * is reported and the others are still read.
 */
export const readTraceTranscripts = async ({
  esClient,
  traces,
  spaceId,
  since,
  after = '',
  until,
  size,
}: {
  /** Scoped to the workflow user: traces are read with their Elasticsearch privileges. */
  esClient: ElasticsearchClient;
  traces: AiIndexTraceWithQuery[];
  spaceId: string;
  since: string;
  after?: string;
  until: string;
  size: number;
}): Promise<ReadTraceTranscriptsOutput> => {
  if (Date.parse(until) <= Date.parse(since)) {
    return {
      memories: [],
      resume_from: since,
      ...(after && { resume_after: after }),
      sources: [],
      skipped: 0,
    };
  }

  const sources: ReadTraceTranscriptsOutput['sources'] = [];
  const found: TraceRound[] = [];
  let boundary: TraceRound | undefined;
  for (const { type, value, query } of traces) {
    try {
      const rounds = await findTraceRounds({ esClient, query, since, after, until, size });
      sources.push({ type, value, rounds: rounds.length });
      found.push(...rounds);
      const last = rounds[rounds.length - 1];
      if (rounds.length === size && last && (!boundary || compareRounds(last, boundary) < 0)) {
        boundary = last;
      }
    } catch (error) {
      sources.push({ type, value, rounds: 0, error: formatErrorMessage(error) });
    }
  }

  const seen = new Set<string>();
  const eligible = found
    .sort(compareRounds)
    .filter(({ traceId }) => !seen.has(traceId) && !!seen.add(traceId))
    .filter((round) => !boundary || compareRounds(round, boundary) <= 0);
  const taken = eligible.slice(0, size);
  const capped = boundary !== undefined || eligible.length > size;
  const last = taken[taken.length - 1];

  const byTarget = new Map<string, TraceRound[]>();
  for (const round of taken) {
    byTarget.set(round.target, [...(byTarget.get(round.target) ?? []), round]);
  }
  const loaded = new Map<string, LoadedRound>();
  for (const [target, rounds] of byTarget) {
    const spans = await loadTraceRounds(
      esClient,
      target,
      rounds.map(({ traceId }) => traceId)
    );
    spans.forEach((round, traceId) => loaded.set(traceId, round));
  }

  let skipped = 0;
  const memories = taken.flatMap((round) => {
    const spans = loaded.get(round.traceId) ?? {};
    const transcript = buildRoundTranscript({
      lastChat: { inputMessages: spans.inputMessages, outputMessages: spans.outputMessages },
    });
    if (transcript === undefined) {
      skipped++;
      return [];
    }
    return [toMemory(round, spans, transcript, spaceId)];
  });

  return {
    memories,
    ...(capped && last
      ? { resume_from: last.lastAt, resume_after: last.traceId }
      : { resume_from: until }),
    sources,
    skipped,
  };
};
