/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { MAX_STREAMS_UNIT_STATS_COMPONENTS, type StreamsUnit } from '@kbn/streams-schema';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { StatusError } from '../streams/errors/status_error';
import { toEsqlRequest } from '../streams/helpers/esql';
import { UNIT_STATS_DEFAULT_WINDOW_MS, UNIT_STATS_REQUEST_TIMEOUT_MS } from './constants';
import { toSearchError } from './errors/search_errors';
import {
  mostActionableFailure,
  STATS_ERROR_CODE,
  type UnitStatsError,
} from './errors/unit_stats_error';
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
import type { StatsQueryBaseParams } from './query_builders/filters';
import { getSeriesBucketMs } from './utils/series_bucket';
import { validateDestination, validateProcessor } from './validate_components';

/** The results of one kind, and the error when its queries failed. */
interface KindOutcome<TResult> {
  results: Record<string, TResult>;
  error?: UnitStatsError;
}

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
    const baseParams: StatsQueryBaseParams = { unitId, window, configHash };

    const destinationConfigs = new Map((unit.destinations ?? []).map((d) => [d.id, d]));
    const processorConfigs = new Map((unit.processors ?? []).map((p) => [p.id, p]));

    // Omitted: every destination and processor in the unit, if one request can hold them. A list,
    // even an empty one, names exactly the components to answer for.
    const refs = request.components ?? this.getAllUnitRefs(unit);

    const destinations: Record<string, StreamsUnit.StatsDestinationResult> = {};
    const processors: Record<string, StreamsUnit.StatsProcessorResult> = {};
    const queryableRefs: StreamsUnit.StatsComponentRef[] = [];

    for (const ref of refs) {
      if (ref.kind === 'destination') {
        const { result, queryable } = validateDestination({
          config: destinationConfigs.get(ref.id),
          bucketMs,
        });
        destinations[ref.id] = result;
        if (queryable) queryableRefs.push(ref);
      } else {
        const { result, queryable } = validateProcessor({
          config: processorConfigs.get(ref.id),
        });
        processors[ref.id] = result;
        if (queryable) queryableRefs.push(ref);
      }
    }

    const [destinationOutcome, processorOutcome] = await this.getComponentStats({
      baseParams,
      refs: queryableRefs,
      bucketMs,
    });
    Object.assign(destinations, destinationOutcome?.results);
    Object.assign(processors, processorOutcome?.results);

    // Every kind that ran failed: there is nothing to return, so the request fails with the most
    // actionable error, and `createServerRoute` maps it to its HTTP status.
    const failures = [destinationOutcome, processorOutcome].flatMap((outcome) =>
      outcome?.error ? [outcome.error] : []
    );
    const ranKinds = [destinationOutcome, processorOutcome].filter(Boolean).length;
    if (failures.length > 0 && failures.length === ranKinds) {
      throw mostActionableFailure(failures);
    }

    return {
      components: { destinations, processors },
      meta: { window, ...(configHash ? { config_hash: configHash } : {}) },
    };
  }

  /** Every destination and processor in the unit, as long as one request can name them all. */
  private getAllUnitRefs(unit: StreamsUnit.Configuration): StreamsUnit.StatsComponentRef[] {
    const refs = [
      ...(unit.destinations ?? []).map(({ id }) => ({ kind: 'destination' as const, id })),
      ...(unit.processors ?? []).map(({ id }) => ({ kind: 'processor' as const, id })),
    ];
    if (refs.length > MAX_STREAMS_UNIT_STATS_COMPONENTS) {
      throw new StatusError(
        `This unit has ${refs.length} components, and one request can name at most ${MAX_STREAMS_UNIT_STATS_COMPONENTS}. Pass "components" to choose which ones.`,
        400
      );
    }
    return refs;
  }

  /**
   * The stats of the components to query, by kind: one pair of queries per kind, all in parallel.
   * A kind with no components runs none. The probe gates them: with no stream there is nothing to
   * query, so the components keep their no data results. If the probe fails, no query runs and
   * each kind gets its error.
   */
  private async getComponentStats({
    baseParams,
    refs,
    bucketMs,
  }: {
    baseParams: StatsQueryBaseParams;
    refs: StreamsUnit.StatsComponentRef[];
    bucketMs: number;
  }) {
    const destinationIds = refs.flatMap(({ kind, id }) => (kind === 'destination' ? [id] : []));
    const processorIds = refs.flatMap(({ kind, id }) => (kind === 'processor' ? [id] : []));

    if (refs.length === 0) return [];

    try {
      if (!(await this.doesUnitMetricsStreamExist())) return [];
    } catch (error) {
      const what = 'stream probe';
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return [
        destinationIds.length > 0
          ? this.destinationFailure({ ids: destinationIds, bucketMs, failure })
          : undefined,
        processorIds.length > 0 ? this.processorFailure({ ids: processorIds, failure }) : undefined,
      ];
    }

    return Promise.all([
      destinationIds.length > 0
        ? this.getDestinationStats({ baseParams, ids: destinationIds, bucketMs })
        : undefined,
      processorIds.length > 0
        ? this.getProcessorStats({ baseParams, ids: processorIds })
        : undefined,
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

  /**
   * Logs a failed query. A query that fails or times out is not expected, so it is a `warn`. A
   * 403, 429 or 503 is an expected state of the cluster, so it stays at `debug`.
   */
  private logFailure(failure: UnitStatsError, { unitId, what }: { unitId: string; what: string }) {
    const { logger } = this.dependencies;
    const isUnexpected =
      failure.code === STATS_ERROR_CODE.error || failure.code === STATS_ERROR_CODE.timeout;
    const { cause } = failure;
    logger[isUnexpected ? 'warn' : 'debug'](
      `Unit stats ${what} failed for unit [${unitId}] (${failure.code}): ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
  }

  private async getDestinationStats({
    baseParams,
    ids,
    bucketMs,
  }: {
    baseParams: StatsQueryBaseParams;
    ids: string[];
    bucketMs: number;
  }): Promise<KindOutcome<StreamsUnit.StatsDestinationResult>> {
    const what = 'destination stats';

    try {
      const [rateRows, sumsRows] = await Promise.all([
        this.runQuery(buildDestinationRateQuery({ ...baseParams, ids })),
        this.runQuery(buildDestinationSumsQuery({ ...baseParams, ids, bucketMs })),
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
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return this.destinationFailure({ ids, bucketMs, failure });
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
    failure: UnitStatsError;
  }): KindOutcome<StreamsUnit.StatsDestinationResult> {
    return {
      results: Object.fromEntries(
        ids.map((id) => [id, { ...noDestinationStats(bucketMs), error: failure.toStatsError() }])
      ),
      error: failure,
    };
  }

  private async getProcessorStats({
    baseParams,
    ids,
  }: {
    baseParams: StatsQueryBaseParams;
    ids: string[];
  }): Promise<KindOutcome<StreamsUnit.StatsProcessorResult>> {
    const what = 'processor stats';

    try {
      const [rateRows, sumsRows] = await Promise.all([
        this.runQuery(buildProcessorRateQuery({ ...baseParams, ids })),
        this.runQuery(buildProcessorSumsQuery({ ...baseParams, ids })),
      ]);
      const mapped = mapProcessorStatsRows({ rows: joinProcessorRows({ rateRows, sumsRows }) });

      return {
        results: Object.fromEntries(ids.map((id) => [id, mapped[id] ?? noProcessorStats()])),
      };
    } catch (error) {
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return this.processorFailure({ ids, failure });
    }
  }

  /** The same error on every processor, with no data. */
  private processorFailure({
    ids,
    failure,
  }: {
    ids: string[];
    failure: UnitStatsError;
  }): KindOutcome<StreamsUnit.StatsProcessorResult> {
    return {
      results: Object.fromEntries(
        ids.map((id) => [id, { ...noProcessorStats(), error: failure.toStatsError() }])
      ),
      error: failure,
    };
  }
}
