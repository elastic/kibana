/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { StreamsUnit } from '@kbn/streams-schema';
import { UNIT_STATS_DEFAULT_WINDOW_MS } from './constants';
import { getDestinationStats } from './get_destination_stats';
import { getEarliestStartMs } from './get_earliest_start';
import { getProcessorStats } from './get_processor_stats';
import { errorForSearchFailure, isMissingStreamError } from './search_errors';
import { getSeriesBucketMs } from './series_bucket';
import type { UnitStatsQueryContext } from './types';
import { validateDestination, validateProcessor } from './validate_components';

const dedupe = (refs: StreamsUnit.StatsComponentRef[]): StreamsUnit.StatsComponentRef[] => {
  const seen = new Set<string>();
  return refs.filter(({ kind, id }) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getUnitStats = async ({
  unitId,
  unit,
  request,
  esClient,
  logger,
  now = new Date(),
}: {
  unitId: string;
  unit: StreamsUnit.Configuration;
  request: StreamsUnit.StatsRequest;
  esClient: ElasticsearchClient;
  logger: Logger;
  now?: Date;
}): Promise<StreamsUnit.StatsResponse> => {
  const configHash = request.filter?.config_hash;
  const window = request.filter?.time_range ?? {
    start: new Date(now.getTime() - UNIT_STATS_DEFAULT_WINDOW_MS).toISOString(),
    end: now.toISOString(),
  };
  const windowStartMs = Date.parse(window.start);
  const windowEndMs = Date.parse(window.end);
  const bucketMs = getSeriesBucketMs(windowEndMs - windowStartMs);
  const context: UnitStatsQueryContext = { esClient, logger, unitId, window, configHash };

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
    earliestStartMs = await getEarliestStartMs(context);
  } catch (error) {
    if (isMissingStreamError(error)) return finish();
    logger.debug(`Unit stats lookup failed for unit [${unitId}]: ${(error as Error).message}`);
    return finish(errorForSearchFailure(error, 'stats'));
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
      ? getDestinationStats({ context, ids: destinationIds, seconds, bucketMs })
      : {},
    processorIds.length > 0 ? getProcessorStats({ context, ids: processorIds, seconds }) : {},
  ]);
  Object.assign(destinations, destinationResults);
  Object.assign(processors, processorResults);

  return finish();
};
