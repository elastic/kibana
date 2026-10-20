/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { StreamsUnit } from '@kbn/streams-schema';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { chunk } from 'lodash';
import { toEsqlRequest } from '../streams/helpers/esql';
import { UNIT_STATS_DEFAULT_WINDOW_MS, UNIT_STATS_REQUEST_TIMEOUT_MS } from './constants';
import { toSearchError } from './errors/search_errors';
import { toRows, type EsqlRow } from './mappers/esql_rows';
import {
  joinDestinationRows,
  mapDestinationStatsRows,
  noDestinationStats,
} from './mappers/map_destination_stats_result';
import {
  joinProcessorRows,
  mapProcessorStatsRows,
  noProcessorStats,
} from './mappers/map_processor_stats_result';
import {
  buildDestinationRateQuery,
  buildDestinationSumsQuery,
} from './query_builders/build_destination_stats_queries';
import {
  buildProcessorRateQuery,
  buildProcessorSumsQuery,
} from './query_builders/build_processor_stats_queries';
import { buildStreamProbeQuery } from './query_builders/build_stream_probe_query';
import type { StatsWindow } from './query_builders/filters';
import { getIdsPerSeriesQuery, getSeriesBucketMs } from './utils/series_bucket';
import { validateDestination, validateProcessor } from './validate_components';

/** What every stats query for one request shares. */
interface StatsQuery {
  unitId: string;
  window: StatsWindow;
  /** Set only when the request pins a config hash. */
  configHash?: string;
}

/** The results of one kind, and the error when its queries failed. */
interface KindOutcome<TResult> {
  results: Record<string, TResult>;
  error?: StreamsUnit.StatsError;
}

const dedupe = (refs: StreamsUnit.StatsComponentRef[]): StreamsUnit.StatsComponentRef[] => {
  const seen = new Set<string>();
  return refs.filter(({ kind, id }) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export class UnitStatsClient {
  constructor(
    private readonly dependencies: {
      esClient: ElasticsearchClient;
      logger: Logger;
    }
  ) {}

  async getStats({
    unitId,
    unit,
    request,
    now = new Date(),
  }: {
    unitId: string;
    unit: StreamsUnit.Configuration;
    request: StreamsUnit.StatsRequest;
    now?: Date;
  }): Promise<StreamsUnit.StatsResponse> {
    const configHash = request.filter?.config_hash;
    const window = request.filter?.time_range ?? {
      start: new Date(now.getTime() - UNIT_STATS_DEFAULT_WINDOW_MS).toISOString(),
      end: now.toISOString(),
    };
    const bucketMs = getSeriesBucketMs(Date.parse(window.end) - Date.parse(window.start));
    const query: StatsQuery = { unitId, window, configHash };

    const destinationConfigs = new Map((unit.destinations ?? []).map((d) => [d.id, d]));
    const processorConfigs = new Map((unit.processors ?? []).map((p) => [p.id, p]));

    // Omitted or empty: every destination and processor in the unit.
    const refs = dedupe(
      request.components?.length
        ? request.components
        : [
            ...(unit.destinations ?? []).map(({ id }) => ({ kind: 'destination' as const, id })),
            ...(unit.processors ?? []).map(({ id }) => ({ kind: 'processor' as const, id })),
          ]
    );

    const destinations: Record<string, StreamsUnit.StatsDestinationResult> = {};
    const processors: Record<string, StreamsUnit.StatsProcessorResult> = {};
    const destinationIds: string[] = [];
    const processorIds: string[] = [];

    for (const { kind, id } of refs) {
      if (kind === 'destination') {
        const { result, queryable } = validateDestination({
          config: destinationConfigs.get(id),
          bucketMs,
        });
        destinations[id] = result;
        if (queryable) destinationIds.push(id);
      } else {
        const { result, queryable } = validateProcessor({ config: processorConfigs.get(id) });
        processors[id] = result;
        if (queryable) processorIds.push(id);
      }
    }

    const [destinationOutcome, processorOutcome] = await this.getOutcomes({
      query,
      destinationIds,
      processorIds,
      bucketMs,
    });
    Object.assign(destinations, destinationOutcome?.results);
    Object.assign(processors, processorOutcome?.results);

    // Every kind that ran failed with the same code: the response says so too.
    const outcomes = [destinationOutcome, processorOutcome].flatMap((outcome) =>
      outcome ? [outcome] : []
    );
    const firstError = outcomes[0]?.error;
    const allFailedTheSame =
      firstError !== undefined && outcomes.every(({ error }) => error?.code === firstError.code);

    return {
      ...(allFailedTheSame ? { error: firstError } : {}),
      components: { destinations, processors },
      meta: { window, ...(configHash ? { config_hash: configHash } : {}) },
    };
  }

  /**
   * One pair of queries per kind, all in parallel. A kind with no queryable ids runs none. The
   * probe gates them: with no stream there is nothing to query, so the ids keep their no data
   * results. If the probe fails, no query runs and each kind gets its error.
   */
  private async getOutcomes({
    query,
    destinationIds,
    processorIds,
    bucketMs,
  }: {
    query: StatsQuery;
    destinationIds: string[];
    processorIds: string[];
    bucketMs: number;
  }) {
    if (destinationIds.length + processorIds.length === 0) return [];

    try {
      if (!(await this.doesUnitMetricsStreamExist())) return [];
    } catch (error) {
      const failure = this.toKindError(error, query.unitId, 'stream probe');

      return [
        destinationIds.length > 0
          ? this.destinationFailure({ ids: destinationIds, bucketMs, failure })
          : undefined,
        processorIds.length > 0 ? this.processorFailure({ ids: processorIds, failure }) : undefined,
      ];
    }

    return Promise.all([
      destinationIds.length > 0
        ? this.getDestinationStats({ query, ids: destinationIds, bucketMs })
        : undefined,
      processorIds.length > 0 ? this.getProcessorStats({ query, ids: processorIds }) : undefined,
    ]);
  }

  /**
   * False when the stream is missing (or not readable, which ES|QL reports the same way). Any
   * other failure throws, so the caller can skip the queries and report why.
   */
  private async doesUnitMetricsStreamExist(): Promise<boolean> {
    const { esClient } = this.dependencies;
    try {
      await esClient.esql.query(toEsqlRequest(buildStreamProbeQuery()), {
        requestTimeout: UNIT_STATS_REQUEST_TIMEOUT_MS,
      });
      return true;
    } catch (error) {
      if (isEsqlUnknownIndexError(error)) return false;
      throw error;
    }
  }

  /** The rows of a query. */
  private async runQuery(query: ComposerQuery): Promise<EsqlRow[]> {
    const { esClient } = this.dependencies;
    const response = (await esClient.esql.query(
      { ...toEsqlRequest(query), allow_partial_results: false },
      { requestTimeout: UNIT_STATS_REQUEST_TIMEOUT_MS }
    )) as ESQLSearchResponse;

    return toRows(response);
  }

  /** The rows of a query run for each chunk of `chunkSize` ids, in parallel. */
  private async runQueryInChunks(
    ids: string[],
    chunkSize: number,
    buildQuery: (chunkIds: string[]) => ComposerQuery
  ): Promise<EsqlRow[]> {
    const chunks = await Promise.all(
      chunk(ids, chunkSize).map((chunkIds) => this.runQuery(buildQuery(chunkIds)))
    );
    return chunks.flat();
  }

  /** The error a failed query puts on every id of its kind, so the other kind is unaffected. */
  private toKindError(error: unknown, unitId: string, what: string): StreamsUnit.StatsError {
    const { logger } = this.dependencies;
    logger.debug(`Unit stats ${what} failed for unit [${unitId}]: ${(error as Error).message}`);
    return toSearchError(error, what).toStatsError();
  }

  private async getDestinationStats({
    query,
    ids,
    bucketMs,
  }: {
    query: StatsQuery;
    ids: string[];
    bucketMs: number;
  }): Promise<KindOutcome<StreamsUnit.StatsDestinationResult>> {
    const what = 'destination stats';
    const chunkSize = getIdsPerSeriesQuery({
      rangeMs: Date.parse(query.window.end) - Date.parse(query.window.start),
      bucketMs,
    });

    try {
      const [rateRows, sumsRows] = await Promise.all([
        this.runQuery(buildDestinationRateQuery({ ...query, ids })),
        this.runQueryInChunks(ids, chunkSize, (chunkIds) =>
          buildDestinationSumsQuery({ ...query, ids: chunkIds, bucketMs })
        ),
      ]);
      const mapped = mapDestinationStatsRows({
        rows: joinDestinationRows({ rateRows, sumsRows }),
        bucketMs,
      });

      return {
        results: Object.fromEntries(
          ids.map((id) => [id, mapped[id] ?? noDestinationStats(bucketMs)])
        ),
      };
    } catch (error) {
      return this.destinationFailure({
        ids,
        bucketMs,
        failure: this.toKindError(error, query.unitId, what),
      });
    }
  }

  /** The same error on every destination, with no data. */
  private destinationFailure({
    ids,
    bucketMs,
    failure,
  }: {
    ids: string[];
    bucketMs: number;
    failure: StreamsUnit.StatsError;
  }): KindOutcome<StreamsUnit.StatsDestinationResult> {
    return {
      results: Object.fromEntries(
        ids.map((id) => [id, { ...noDestinationStats(bucketMs), error: failure }])
      ),
      error: failure,
    };
  }

  private async getProcessorStats({
    query,
    ids,
  }: {
    query: StatsQuery;
    ids: string[];
  }): Promise<KindOutcome<StreamsUnit.StatsProcessorResult>> {
    const what = 'processor stats';

    try {
      const [rateRows, sumsRows] = await Promise.all([
        this.runQuery(buildProcessorRateQuery({ ...query, ids })),
        this.runQuery(buildProcessorSumsQuery({ ...query, ids })),
      ]);
      const mapped = mapProcessorStatsRows({ rows: joinProcessorRows({ rateRows, sumsRows }) });

      return {
        results: Object.fromEntries(ids.map((id) => [id, mapped[id] ?? noProcessorStats()])),
      };
    } catch (error) {
      return this.processorFailure({
        ids,
        failure: this.toKindError(error, query.unitId, what),
      });
    }
  }

  /** The same error on every processor, with no data. */
  private processorFailure({
    ids,
    failure,
  }: {
    ids: string[];
    failure: StreamsUnit.StatsError;
  }): KindOutcome<StreamsUnit.StatsProcessorResult> {
    return {
      results: Object.fromEntries(ids.map((id) => [id, { ...noProcessorStats(), error: failure }])),
      error: failure,
    };
  }
}
