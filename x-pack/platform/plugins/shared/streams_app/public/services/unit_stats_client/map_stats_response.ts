/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type {
  DestinationStatsView,
  MappedComponentStats,
  MappedStatsResponse,
  ProcessorStatsView,
} from './types';

const NOT_FOUND_ERROR_CODE = 'not_found';

const EMPTY_DESTINATION_STATS: DestinationStatsView = {
  eventsRate: null,
  eventsTotal: null,
  failedRate: null,
  latencyAverage: null,
  series: { bucketMs: 0, points: [] },
};

const EMPTY_PROCESSOR_STATS: ProcessorStatsView = { instances: [] };

const toDestinationStats = ({
  events,
  latency,
}: StreamsUnit.StatsDestinationResult): DestinationStatsView => ({
  eventsRate: events.incoming.rate.value,
  eventsTotal: events.incoming.total.value,
  failedRate: events.failed.rate.value,
  latencyAverage: latency.average.value,
  series: {
    bucketMs: events.incoming.series.bucket_ms,
    points: events.incoming.series.points,
  },
});

const toProcessorStats = ({ instances }: StreamsUnit.StatsProcessorResult): ProcessorStatsView => ({
  instances: instances.map(({ pipeline_id: pipelineId, route_index: routeIndex, ...instance }) => ({
    pipelineId,
    routeIndex,
    eventsRate: instance.events.incoming.rate.value,
    failedRate: instance.events.failed.rate.value,
    durationAverage: instance.processing_duration.average.value,
  })),
});

const hasDestinationData = ({
  eventsRate,
  eventsTotal,
  failedRate,
  latencyAverage,
}: DestinationStatsView): boolean =>
  [eventsRate, eventsTotal, failedRate, latencyAverage].some((value) => value !== null);

const hasProcessorData = ({ instances }: ProcessorStatsView): boolean => instances.length > 0;

/**
 * The one place that decides what a result means. A component error is an error, except
 * `not_found`, which is no data. A `0` is data. `null` is never data.
 */
const classify = <TStats>(
  stats: TStats,
  hasData: (stats: TStats) => boolean,
  error?: StreamsUnit.StatsError
): MappedComponentStats<TStats> => {
  if (error && error.code !== NOT_FOUND_ERROR_CODE) {
    return { status: 'error', stats, error };
  }
  return { status: hasData(stats) ? 'ready' : 'noData', stats };
};

/** A destination that the response leaves out shows as no data. */
const mapDestinationResult = (
  result: StreamsUnit.StatsDestinationResult | undefined
): MappedComponentStats<DestinationStatsView> =>
  result
    ? classify(toDestinationStats(result), hasDestinationData, result.error)
    : classify(EMPTY_DESTINATION_STATS, hasDestinationData);

/** A processor that the response leaves out shows as no data. */
const mapProcessorResult = (
  result: StreamsUnit.StatsProcessorResult | undefined
): MappedComponentStats<ProcessorStatsView> =>
  result
    ? classify(toProcessorStats(result), hasProcessorData, result.error)
    : classify(EMPTY_PROCESSOR_STATS, hasProcessorData);

/** An id is user-defined, so `constructor` must not be read from `Object.prototype` as a result. */
const getOwnResult = <TResult>(results: Record<string, TResult>, id: string): TResult | undefined =>
  Object.hasOwn(results, id) ? results[id] : undefined;

/**
 * Converts the response to the view types. Only the requested components are mapped, so a
 * component that the response leaves out shows as no data, instead of as a missing entry.
 */
export const mapStatsResponse = (
  { components, meta }: StreamsUnit.StatsResponse,
  requested: StreamsUnit.StatsComponentRef[]
): MappedStatsResponse => {
  const destinations: MappedStatsResponse['destinations'] = {};
  const processors: MappedStatsResponse['processors'] = {};

  for (const { kind, id } of requested) {
    switch (kind) {
      case 'destination':
        destinations[id] = mapDestinationResult(getOwnResult(components.destinations, id));
        break;
      case 'processor':
        processors[id] = mapProcessorResult(getOwnResult(components.processors, id));
        break;
      default:
        // A kind this UI does not know is dropped, so a new kind in the schema never breaks a node.
        break;
    }
  }

  return { destinations, processors, window: meta.window };
};
