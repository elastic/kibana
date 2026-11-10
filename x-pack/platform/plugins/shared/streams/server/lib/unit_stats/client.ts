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
import {
  ESQL_MAX_ROWS,
  UNIT_METRICS_STREAM,
  UNIT_STATS_DEFAULT_WINDOW_MS,
  UNIT_STATS_REQUEST_TIMEOUT_MS,
} from './constants';
import { toSearchError } from './errors/search_errors';
import { mostActionableFailure, STATS_ERROR_CODE, UnitStatsError } from './errors/unit_stats_error';
import { toRows, type EsqlRow } from './mappers/esql_rows';
import {
  joinDestinationRows,
  mapDestinationStatsRows,
  noDestinationStats,
} from './mappers/map_destination_stats_result';
import { mapProcessorStatsRows, noProcessorStats } from './mappers/map_processor_stats_result';
import { mapSourceStatsRows, noSourceStats } from './mappers/map_source_stats_result';
import {
  buildDestinationRateQuery,
  buildDestinationSumsQuery,
} from './query_builders/build_destination_stats_queries';
import { buildProcessorSumsQuery } from './query_builders/build_processor_stats_queries';
import { buildSourceRateQuery } from './query_builders/build_source_stats_queries';
import { buildStreamProbeQuery } from './query_builders/build_stream_probe_query';
import type { StatsQueryBaseParams } from './query_builders/filters';
import { getSeriesBucketMs } from './utils/series_bucket';
import { validateDestination, validateProcessor, validateSource } from './validate_components';

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
    const sourceConfigs = new Map((unit.sources ?? []).map((s) => [s.id, s]));

    // Omitted: every destination, processor and source in the unit, if one request can hold them. A
    // list, even an empty one, names exactly the components to answer for.
    const refs = request.components ?? this.getAllUnitRefs(unit);

    const destinations: Record<string, StreamsUnit.StatsDestinationResult> = {};
    const processors: Record<string, StreamsUnit.StatsProcessorResult> = {};
    const sources: Record<string, StreamsUnit.StatsSourceResult> = {};
    const queryableRefs: StreamsUnit.StatsComponentRef[] = [];

    for (const ref of refs) {
      if (ref.kind === 'destination') {
        const { result, queryable } = validateDestination({
          config: destinationConfigs.get(ref.id),
          bucketMs,
        });
        destinations[ref.id] = result;
        if (queryable) queryableRefs.push(ref);
      } else if (ref.kind === 'processor') {
        const { result, queryable } = validateProcessor({
          config: processorConfigs.get(ref.id),
        });
        processors[ref.id] = result;
        if (queryable) queryableRefs.push(ref);
      } else {
        const { result, queryable } = validateSource({
          config: sourceConfigs.get(ref.id),
        });
        sources[ref.id] = result;
        if (queryable) queryableRefs.push(ref);
      }
    }

    const [destinationOutcome, processorOutcome, sourceOutcome] = await this.getComponentStats({
      baseParams,
      refs: queryableRefs,
      bucketMs,
    });
    Object.assign(destinations, destinationOutcome?.results);
    Object.assign(processors, processorOutcome?.results);
    Object.assign(sources, sourceOutcome?.results);

    // Every kind that ran failed: there is nothing to return, so the request fails with the most
    // actionable error, and `createServerRoute` maps it to its HTTP status.
    const outcomes = [destinationOutcome, processorOutcome, sourceOutcome];
    const failures = outcomes.flatMap((outcome) => (outcome?.error ? [outcome.error] : []));
    const ranKinds = outcomes.filter(Boolean).length;
    if (failures.length > 0 && failures.length === ranKinds) {
      throw mostActionableFailure(failures);
    }

    return {
      components: { destinations, processors, sources },
      meta: { window, ...(configHash ? { config_hash: configHash } : {}) },
    };
  }

  /** Every destination, processor and source in the unit, as long as one request can name them all. */
  private getAllUnitRefs(unit: StreamsUnit.Configuration): StreamsUnit.StatsComponentRef[] {
    const refs = [
      ...(unit.destinations ?? []).map(({ id }) => ({ kind: 'destination' as const, id })),
      ...(unit.processors ?? []).map(({ id }) => ({ kind: 'processor' as const, id })),
      ...(unit.sources ?? []).map(({ id }) => ({ kind: 'source' as const, id })),
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
    const sourceIds = refs.flatMap(({ kind, id }) => (kind === 'source' ? [id] : []));

    if (refs.length === 0) return [];

    try {
      if (!(await this.doesUnitMetricsStreamExist())) return [];
    } catch (error) {
      const what = 'stream probe';
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return [
        destinationIds.length > 0
          ? this.componentKindFailure({
              ids: destinationIds,
              failure,
              noData: () => noDestinationStats(bucketMs),
            })
          : undefined,
        processorIds.length > 0
          ? this.componentKindFailure({ ids: processorIds, failure, noData: noProcessorStats })
          : undefined,
        sourceIds.length > 0
          ? this.componentKindFailure({ ids: sourceIds, failure, noData: noSourceStats })
          : undefined,
      ];
    }

    return Promise.all([
      destinationIds.length > 0
        ? this.getDestinationStats({ baseParams, ids: destinationIds, bucketMs })
        : undefined,
      processorIds.length > 0
        ? this.getProcessorStats({ baseParams, ids: processorIds })
        : undefined,
      sourceIds.length > 0 ? this.getSourceStats({ baseParams, ids: sourceIds }) : undefined,
    ]);
  }

  /**
   * False when the stream is missing, as it is until the unit reports its first metrics. ES|QL
   * reports a stream the user cannot read the same way, so that case is told apart with a
   * privilege check and fails as `forbidden`. Any other failure throws, so the caller can skip
   * the queries and report why.
   */
  private async doesUnitMetricsStreamExist(): Promise<boolean> {
    const { esClient } = this.dependencies;
    try {
      await esClient.esql.query(toEsqlRequest(buildStreamProbeQuery()), {
        requestTimeout: UNIT_STATS_REQUEST_TIMEOUT_MS,
      });
      return true;
    } catch (error) {
      if (!isEsqlUnknownIndexError(error)) throw error;

      const { has_all_requested: canRead } = await esClient.security.hasPrivileges({
        index: [{ names: [UNIT_METRICS_STREAM], privileges: ['read'] }],
      });
      if (!canRead) throw UnitStatsError.forbidden();

      return false;
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
          ids.map((id) => [
            id,
            Object.hasOwn(mapped, id) ? mapped[id] : noDestinationStats(bucketMs),
          ])
        ),
      };
    } catch (error) {
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return this.componentKindFailure({
        ids,
        failure,
        noData: () => noDestinationStats(bucketMs),
      });
    }
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
      const rows = await this.runQuery(buildProcessorSumsQuery({ ...baseParams, ids }));
      // We expect this to be an unlikely state, but let's be aware of it: ES|QL cuts a result at
      // its row limit without saying so.
      if (rows.length >= ESQL_MAX_ROWS) {
        this.dependencies.logger.warn(
          `Unit stats ${what} for unit [${baseParams.unitId}] reached the ${ESQL_MAX_ROWS} row limit, so some instances are missing`
        );
      }

      const mapped = mapProcessorStatsRows({ rows });

      return {
        results: Object.fromEntries(
          ids.map((id) => [id, Object.hasOwn(mapped, id) ? mapped[id] : noProcessorStats()])
        ),
      };
    } catch (error) {
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return this.componentKindFailure({ ids, failure, noData: noProcessorStats });
    }
  }

  private async getSourceStats({
    baseParams,
    ids,
  }: {
    baseParams: StatsQueryBaseParams;
    ids: string[];
  }): Promise<KindOutcome<StreamsUnit.StatsSourceResult>> {
    const what = 'source stats';

    try {
      const rows = await this.runQuery(buildSourceRateQuery({ ...baseParams, ids }));
      const mapped = mapSourceStatsRows({ rows });

      return {
        results: Object.fromEntries(
          ids.map((id) => [id, Object.hasOwn(mapped, id) ? mapped[id] : noSourceStats()])
        ),
      };
    } catch (error) {
      const failure = toSearchError(error, what);
      this.logFailure(failure, { unitId: baseParams.unitId, what });

      return this.componentKindFailure({ ids, failure, noData: noSourceStats });
    }
  }

  /** The same error on every component of a kind, each with no data. */
  private componentKindFailure<TResult extends object>({
    ids,
    failure,
    noData,
  }: {
    ids: string[];
    failure: UnitStatsError;
    noData: () => TResult;
  }): KindOutcome<TResult> {
    return {
      results: Object.fromEntries(
        ids.map((id) => [id, { ...noData(), error: failure.toStatsError() }])
      ),
      error: failure,
    };
  }
}
