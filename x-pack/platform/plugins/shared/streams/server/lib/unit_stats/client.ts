/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { StreamsUnit } from '@kbn/streams-schema';
import { buildDestinationStatsRequest } from './build_destination_stats_request';
import { buildProcessorStatsRequest } from './build_processor_stats_request';
import { UNIT_STATS_DEFAULT_WINDOW_MS } from './constants';
import {
  mapDestinationStatsResponse,
  noDestinationStats,
  type DestinationStatsAggregations,
} from './map_destination_stats_response';
import {
  mapProcessorStatsResponse,
  noProcessorStats,
  type ProcessorStatsAggregations,
} from './map_processor_stats_response';
import { isMissingStreamError, toSearchError } from './search_errors';
import { getSeriesBucketMs } from './series_bucket';
import { buildEarliestStartRequest, readEarliestStartMs, type StatsWindow } from './unit_filter';
import { validateDestination, validateProcessor } from './validate_components';

/** What every stats search for one request shares. */
interface StatsQuery {
  unitId: string;
  window: StatsWindow;
  /** Set only when the request pins a config hash. */
  configHash?: string;
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
    const { logger } = this.dependencies;
    const configHash = request.filter?.config_hash;
    const window = request.filter?.time_range ?? {
      start: new Date(now.getTime() - UNIT_STATS_DEFAULT_WINDOW_MS).toISOString(),
      end: now.toISOString(),
    };
    const windowStartMs = Date.parse(window.start);
    const windowEndMs = Date.parse(window.end);
    const bucketMs = getSeriesBucketMs(windowEndMs - windowStartMs);
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

    const finish = (error?: StreamsUnit.StatsError): StreamsUnit.StatsResponse => ({
      ...(error ? { error } : {}),
      components: { destinations, processors },
      meta: { window, ...(configHash ? { config_hash: configHash } : {}) },
    });

    if (destinationIds.length === 0 && processorIds.length === 0) {
      return finish();
    }

    // Shared lookup. A failure here is response-level.
    let earliestStartMs: number | undefined;
    try {
      earliestStartMs = await this.getEarliestStartMs(query);
    } catch (error) {
      if (isMissingStreamError(error)) return finish();
      logger.debug(`Unit stats lookup failed for unit [${unitId}]: ${(error as Error).message}`);
      return finish(toSearchError(error, 'stats').toStatsError());
    }

    // No document for the unit (and hash) at all: no data, no error.
    if (earliestStartMs === undefined) {
      return finish();
    }

    // The data covers the window end minus the later of the window start and the first
    // document. Not the span of the documents in the window: a stopped destination must not
    // read as busy.
    const seconds = (windowEndMs - Math.max(windowStartMs, earliestStartMs)) / 1000;

    // One search per kind, in parallel. A kind with no queryable ids makes no search.
    const [destinationResults, processorResults] = await Promise.all([
      destinationIds.length > 0
        ? this.getDestinationStats({ query, ids: destinationIds, seconds, bucketMs })
        : {},
      processorIds.length > 0 ? this.getProcessorStats({ query, ids: processorIds, seconds }) : {},
    ]);
    Object.assign(destinations, destinationResults);
    Object.assign(processors, processorResults);

    return finish();
  }

  /**
   * Epoch ms of the first document for the unit, over all time and limited to the pinned
   * hash when there is one. Undefined when no document matches. Throws when the search fails.
   */
  private async getEarliestStartMs({
    unitId,
    configHash,
  }: StatsQuery): Promise<number | undefined> {
    const { esClient } = this.dependencies;
    return readEarliestStartMs(
      await esClient.search(buildEarliestStartRequest({ unitId, configHash }))
    );
  }

  /**
   * One search for all the destination ids. An id with no bucket, or a missing stream, is no
   * data. A failed search puts the same error on every id, so the other kind is unaffected.
   */
  private async getDestinationStats({
    query: { unitId, window, configHash },
    ids,
    seconds,
    bucketMs,
  }: {
    query: StatsQuery;
    ids: string[];
    seconds: number;
    bucketMs: number;
  }): Promise<Record<string, StreamsUnit.StatsDestinationResult>> {
    const { esClient, logger } = this.dependencies;
    const results: Record<string, StreamsUnit.StatsDestinationResult> = {};

    try {
      const response = await esClient.search<unknown, DestinationStatsAggregations>(
        buildDestinationStatsRequest({ unitId, window, ids, configHash, bucketMs })
      );
      const mapped = mapDestinationStatsResponse({
        aggregations: response.aggregations,
        seconds,
        bucketMs,
      });
      for (const id of ids) {
        results[id] = mapped.get(id) ?? noDestinationStats(bucketMs);
      }
    } catch (error) {
      const failure = isMissingStreamError(error)
        ? undefined
        : toSearchError(error, 'destination stats').toStatsError();
      if (failure) {
        logger.debug(`Destination stats failed for unit [${unitId}]: ${(error as Error).message}`);
      }
      for (const id of ids) {
        results[id] = { ...noDestinationStats(bucketMs), ...(failure ? { error: failure } : {}) };
      }
    }

    return results;
  }

  /**
   * One search for all the processor ids. An id with no bucket, or a missing stream, is no
   * data. A failed search puts the same error on every id, so the other kind is unaffected.
   */
  private async getProcessorStats({
    query: { unitId, window, configHash },
    ids,
    seconds,
  }: {
    query: StatsQuery;
    ids: string[];
    seconds: number;
  }): Promise<Record<string, StreamsUnit.StatsProcessorResult>> {
    const { esClient, logger } = this.dependencies;
    const results: Record<string, StreamsUnit.StatsProcessorResult> = {};

    try {
      const response = await esClient.search<unknown, ProcessorStatsAggregations>(
        buildProcessorStatsRequest({ unitId, window, ids, configHash })
      );
      const mapped = mapProcessorStatsResponse({ aggregations: response.aggregations, seconds });
      for (const id of ids) {
        results[id] = mapped.get(id) ?? noProcessorStats();
      }
    } catch (error) {
      const failure = isMissingStreamError(error)
        ? undefined
        : toSearchError(error, 'processor stats').toStatsError();
      if (failure) {
        logger.debug(`Processor stats failed for unit [${unitId}]: ${(error as Error).message}`);
      }
      for (const id of ids) {
        results[id] = { ...noProcessorStats(), ...(failure ? { error: failure } : {}) };
      }
    }

    return results;
  }
}
