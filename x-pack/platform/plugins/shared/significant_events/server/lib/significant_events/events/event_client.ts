/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  SignificantEvent,
  SignificantEventResponse,
  Severity,
  SignificantEventStatus,
  SignalEntry,
  SignalVerdict,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS } from '@kbn/significant-events-schema';
import {
  type BulkCreateOptions,
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
  throwOnBulkCreateErrors,
} from '../query_utils';
import {
  andWhere,
  applyTimeRange,
  executeCountQuery,
  fromIndexForSpace,
  inFilter,
  executeEsqlQuery,
  pickLatestPerGroup,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
} from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  storedEventSchema,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';
import { FIELD_EVENT_UUID, FIELD_EVENT_ID } from '../field_names';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import type {
  SignificantEventsTriggerId,
  SignificantEventsTriggerPayloadMap,
} from '../../../../common/workflows/triggers';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;
export type LegacySignal = Omit<SignalEntry, 'verdict'> & {
  verdict?: SignalVerdict;
  confirmed?: boolean;
};

// TODO: Remove this function once old signals are replaced with the new signal schema
export const normalizeLegacyVerdict = (signal: LegacySignal): SignalEntry => {
  if (signal.verdict !== undefined) return signal as SignalEntry;

  const { confirmed, ...normalizedSignal } = signal;
  const verdict =
    (confirmed === true && signal.evidence?.result === 'found' ? 'confirms' : undefined) ??
    (confirmed === false && signal.evidence?.result === 'found' ? 'refutes' : undefined) ??
    (signal.evidence === undefined || signal.evidence === null
      ? 'not_checked'
      : signal.evidence.result === 'found'
      ? 'off_topic'
      : 'inconclusive');

  return { ...normalizedSignal, verdict } as SignalEntry;
};

const normalizeLegacyVerification = (event: SignificantEvent): SignificantEvent => ({
  ...event,
  signals: event.signals?.map((signal) => normalizeLegacyVerdict(signal as LegacySignal)),
});

/**
 * Maximum number of distinct active events returned by findLatestActive. With stream+rule
 * narrowing the result is proportional to the write batch size, so this cap is a safety bound
 * rather than an operational limit.
 */
const MAX_DEDUP_SCAN_LIMIT = 500;

const multiValueContainsAnyFilter = ({
  where,
  field,
  values,
}: {
  where: ESQLAstExpression | undefined;
  field: string;
  values: string[] | undefined;
}): ESQLAstExpression | undefined => {
  if (!values?.length) return where;

  return andWhere(
    where,
    esql.exp`MV_INTERSECTS(${esql.col(field)}, [${values.map((value) => esql.str(value))}])`
  );
};

const continuationCandidateFilter = ({
  streamNames,
  ruleUuids,
}: {
  streamNames: string[] | undefined;
  ruleUuids: string[] | undefined;
}): ESQLAstExpression | undefined => {
  const streamFilter = multiValueContainsAnyFilter({
    where: undefined,
    field: 'stream_names',
    values: streamNames,
  });
  const ruleFilter = multiValueContainsAnyFilter({
    where: undefined,
    field: 'signals.metadata.rule_uuid',
    values: ruleUuids,
  });

  if (streamFilter && ruleFilter) {
    return andWhere(streamFilter, ruleFilter);
  }

  return streamFilter ?? ruleFilter;
};

const topologyFeatureFilter = (
  topologyFeatureIds: string[] | undefined
): ESQLAstExpression | undefined => {
  if (!topologyFeatureIds?.length) return undefined;
  const values = topologyFeatureIds.map((value) => esql.str(value));
  return esql.exp`(MV_INTERSECTS(${esql.col(
    'causal_features.feature_id'
  )}, [${values}]) OR MV_INTERSECTS(${esql.col('blast_radius.feature_id')}, [${values}]))`;
};

export interface EventsFilterOptions {
  status?: SignificantEventStatus[];
  severity?: Severity[];
  stream?: string[];
  search?: string;
  eventIds?: string[];
  ruleUuids?: string[];
  topologyFeatureIds?: string[];
}

type EventsCurrentStateSearchOptions = CommonSearchOptions & EventsFilterOptions;

export type EventsPaginatedSearchOptions = PaginatedSearchOptions & EventsFilterOptions;

export type EventsBatchSearchOptions = EventsCurrentStateSearchOptions & {
  afterEventId?: string;
  batchSize: number;
};

export class EventClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
      triggerEmitter?: TriggerEmitter;
    }
  ) {}

  /** Fire-and-forget: emits a workflow trigger event if an emitter is wired, otherwise a no-op. */
  emitTrigger<T extends SignificantEventsTriggerId>(
    triggerId: T,
    payload: SignificantEventsTriggerPayloadMap[T]
  ): void {
    this.clients.triggerEmitter?.(triggerId, payload);
  }

  private buildWhere(options: EventsFilterOptions): ESQLAstExpression | undefined {
    let where: ESQLAstExpression | undefined;

    where = inFilter({ where, field: 'status', values: options.status });
    where = multiValueContainsAnyFilter({
      where,
      field: 'stream_names',
      values: options.stream,
    });
    if (options.search) {
      const escaped = options.search.toLowerCase().replace(/\\/g, '\\\\').replace(/[*?]/g, '\\$&');
      const pattern = esql.str(`*${escaped}*`);
      where = andWhere(
        where,
        esql.exp`(TO_LOWER(${esql.col('title')}) LIKE ${pattern} OR TO_LOWER(${esql.col(
          'summary'
        )}) LIKE ${pattern} OR TO_LOWER(${esql.col(
          'symptom_hypothesis'
        )}) LIKE ${pattern} OR TO_LOWER(${esql.col(FIELD_EVENT_ID)}) == TO_LOWER(${esql.str(
          options.search
        )}))`
      );
    }

    return where;
  }

  private buildLatestByCurrentStateQuery(options: EventsCurrentStateSearchOptions): ComposerQuery {
    const candidateWhere = continuationCandidateFilter({
      streamNames: options.stream,
      ruleUuids: options.ruleUuids,
    });
    const eventIdWhere = inFilter({
      where: undefined,
      field: FIELD_EVENT_ID,
      values: options.eventIds,
    });
    const topologyWhere = topologyFeatureFilter(options.topologyFeatureIds);

    let query = fromIndexForSpace({
      index: EVENTS_DATA_STREAM,
      space: this.clients.space,
      columns: ['_id', '_source'],
    }).pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(FIELD_EVENT_ID)}`;

    query = applyTimeRange({
      query,
      from: options.from,
      to: options.to,
    });

    // Free-text search runs pre-latest; current state and continuation-candidate filters run
    // post-latest so stale versions cannot make a closed episode appear open.
    const searchWhere = this.buildWhere({ search: options.search });
    if (searchWhere) {
      query = query.where`${searchWhere}`;
    }

    query = pickLatestPerGroup(query, FIELD_EVENT_ID);

    if (options.status?.length) {
      query = query.where`${esql.col('status')} IN (${options.status.map((status) =>
        esql.str(status)
      )})`;
    }
    if (options.severity?.length) {
      query = query.where`${esql.col('severity')} IN (${options.severity.map((severity) =>
        esql.str(severity)
      )})`;
    }
    if (candidateWhere) {
      query = query.where`${candidateWhere}`;
    }
    if (eventIdWhere) {
      query = query.where`${eventIdWhere}`;
    }
    if (topologyWhere) {
      query = query.where`${topologyWhere}`;
    }

    return query;
  }

  async bulkCreate(
    events: SignificantEvent[],
    { throwOnFail = false, refresh }: BulkCreateOptions = {}
  ) {
    const response = await this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: events.map((e) => storedEventSchema.parse(e)),
      refresh,
    });

    if (throwOnFail) {
      throwOnBulkCreateErrors(response);
    }

    return response;
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: SignificantEvent[] }> {
    const result = await runLatestSourceEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: FIELD_EVENT_ID,
    });
    return { hits: result.hits.map(normalizeLegacyVerification) };
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SignificantEventResponse>> {
    return this.findLatestByCurrentStatePaginated(options);
  }

  async findLatestByCurrentStatePaginated(
    options: EventsPaginatedSearchOptions
  ): Promise<PaginatedResponse<SignificantEventResponse>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 25;

    const dataQuery = this.buildLatestByCurrentStateQuery(options)
      .sort(['@timestamp', 'DESC'], ['_id', 'ASC'])
      .limit(page * perPage)
      .keep('_source', 'created_at');
    const countQuery = this.buildLatestByCurrentStateQuery(options)
      .pipe`STATS total = COUNT(*)`.keep('total');

    const [total, hits] = await Promise.all([
      executeCountQuery({ esClient: this.clients.esClient, query: countQuery }),
      executeEsqlQuery<SignificantEventResponse>({
        esClient: this.clients.esClient,
        query: dataQuery,
        fields: ['created_at'],
      }),
    ]);

    const start = (page - 1) * perPage;
    const paginatedHits = start >= hits.length ? [] : hits.slice(start, start + perPage);

    return {
      hits: paginatedHits.map((event) => ({
        ...normalizeLegacyVerification(event),
        created_at: event.created_at,
      })),
      page,
      perPage,
      total,
    };
  }

  async findLatestByCurrentStateBatch(
    options: EventsBatchSearchOptions
  ): Promise<{ hits: SignificantEventResponse[] }> {
    let query = this.buildLatestByCurrentStateQuery(options);
    if (options.afterEventId !== undefined) {
      query = query.where`${esql.col(FIELD_EVENT_ID)} > ${esql.str(options.afterEventId)}`;
    }

    const hits = await executeEsqlQuery<SignificantEventResponse>({
      esClient: this.clients.esClient,
      query: query
        .sort([FIELD_EVENT_ID, 'ASC'])
        .limit(options.batchSize)
        .keep('_source', 'created_at'),
      fields: ['created_at'],
    });

    return {
      hits: hits.map((event) => ({
        ...normalizeLegacyVerification(event),
        created_at: event.created_at,
      })),
    };
  }

  /**
   * Returns the latest version per event_id for all active (status "open") events within the
   * given time range, optionally narrowed to candidate stream/rule identities so the scan stays
   * proportional to the write batch instead of the whole space. The status and candidate filters
   * are applied after grouping so a closed/dismissed event is correctly excluded.
   *
   * Capped at MAX_DEDUP_SCAN_LIMIT distinct active events. With stream+rule narrowing the result
   * set is proportional to the write batch, so this limit is never approached in practice.
   */
  async findLatestActive(
    options: CommonSearchOptions & { streamNames?: string[]; ruleUuids?: string[] }
  ): Promise<{ hits: SignificantEvent[] }> {
    let query = applyTimeRange({
      query: fromIndexForSpace({
        index: EVENTS_DATA_STREAM,
        space: this.clients.space,
        columns: ['_id', '_source'],
      }),
      from: options.from,
      to: options.to,
    });

    query = pickLatestPerGroup(query, FIELD_EVENT_ID);

    query = query.where`${esql.col('status')} IN (${SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS.map(
      (s) => esql.str(s)
    )})`;

    const candidateWhere = continuationCandidateFilter({
      streamNames: options.streamNames,
      ruleUuids: options.ruleUuids,
    });
    if (candidateWhere) {
      query = query.where`${candidateWhere}`;
    }

    const hits = await executeEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      query: query.keep('_source').limit(MAX_DEDUP_SCAN_LIMIT),
    });
    return { hits: hits.map(normalizeLegacyVerification) };
  }

  async findByEventUuid(id: string): Promise<{ hits: SignificantEvent[] }> {
    const result = await runFindByIdEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: FIELD_EVENT_UUID,
      idValue: id,
    });
    return { hits: result.hits.map(normalizeLegacyVerification) };
  }

  async findByEventId(eventId: string): Promise<{ hits: SignificantEventResponse[] }> {
    const query = fromIndexForSpace({
      index: EVENTS_DATA_STREAM,
      space: this.clients.space,
      columns: ['_source'],
    }).where`${esql.col(FIELD_EVENT_ID)} == ${esql.str(eventId)}`
      .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(FIELD_EVENT_ID)}`
      .sort(['@timestamp', 'ASC'])
      .keep('_source', 'created_at');

    const hits = await executeEsqlQuery<SignificantEventResponse>({
      esClient: this.clients.esClient,
      query,
      fields: ['created_at'],
    });
    return {
      hits: hits.map((event) => ({
        ...normalizeLegacyVerification(event),
        created_at: event.created_at,
      })),
    };
  }

  async findLatestByEventIds(eventIds: string[]): Promise<Map<string, SignificantEvent>> {
    if (!eventIds.length) return new Map();
    const idLiterals = eventIds.map((s) => esql.str(s));
    const where = esql.exp`${esql.col(FIELD_EVENT_ID)} IN (${idLiterals})`;
    const { hits } = await runPaginatedLatestSourceEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options: { perPage: eventIds.length },
      index: EVENTS_DATA_STREAM,
      where,
      groupBy: FIELD_EVENT_ID,
    });
    const map = new Map<string, SignificantEvent>();
    for (const event of hits.map(normalizeLegacyVerification)) {
      if (event.event_id) map.set(event.event_id, event);
    }
    return map;
  }
}
