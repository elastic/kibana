/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type {
  DeliverySeriesView,
  DestinationFailedView,
  DestinationStatsView,
  FailureClassView,
  FailureRateView,
  MappedComponentStats,
  MappedStatsResponse,
  ProcessorStatsView,
  SourceStatsView,
} from './types';

const NOT_FOUND_ERROR_CODE = 'not_found';

/** The code of an entry when its whole request failed. Component errors keep the server's code. */
export const STATS_REQUEST_FAILED_ERROR_CODE = 'request_failed';

// The unit of a rate with no value is a placeholder. Nothing may depend on it.
const EMPTY_FAILURE_RATE: FailureRateView = { rate: null, unit: '{item}', percentage: null };

/** A destination with no failure data: every rate and percentage is `null`, and no cause is listed. */
export const EMPTY_DESTINATION_FAILED: DestinationFailedView = {
  total: EMPTY_FAILURE_RATE,
  authentication: { ...EMPTY_FAILURE_RATE, breakdown: [] },
  authorization: { ...EMPTY_FAILURE_RATE, breakdown: [] },
};

const EMPTY_DESTINATION_STATS: DestinationStatsView = {
  eventsRate: null,
  eventsTotal: null,
  failed: EMPTY_DESTINATION_FAILED,
  latencyAverage: null,
  series: { bucketMs: 0, points: [] },
};

const EMPTY_PROCESSOR_STATS: ProcessorStatsView = { instances: [] };

const EMPTY_SOURCE_STATS: SourceStatsView = { acceptedRate: null };

type FailedResult = StreamsUnit.StatsDestinationResult['events']['failed'];

const toFailureRateView = ({
  rate,
  percentage,
}: Pick<FailedResult, 'rate' | 'percentage'>): FailureRateView => ({
  rate: rate.value,
  unit: rate.unit,
  percentage: percentage.value,
});

const toFailureClassView = (failureClass: FailedResult['authentication']): FailureClassView => ({
  ...toFailureRateView(failureClass),
  breakdown: (failureClass.breakdown ?? []).map(({ collection, reason, rate, percentage }) => ({
    collection,
    reason,
    ...toFailureRateView({ rate, percentage }),
  })),
});

/** The series covers the window of the response, which it does not repeat. */
const toDeliverySeriesView = (
  { bucket_ms: bucketMs, unit, points }: StreamsUnit.StatsDeliverySeries,
  window: StreamsUnit.StatsMeta['window']
): DeliverySeriesView => ({ bucketMs, unit, window, points });

const toDestinationStats = (
  { events, latency }: StreamsUnit.StatsDestinationResult,
  window: StreamsUnit.StatsMeta['window']
): DestinationStatsView => ({
  eventsRate: events.incoming.rate.value,
  eventsTotal: events.incoming.total.value,
  failed: {
    total: toFailureRateView(events.failed),
    authentication: toFailureClassView(events.failed.authentication),
    authorization: toFailureClassView(events.failed.authorization),
    ...(events.delivery ? { series: toDeliverySeriesView(events.delivery.series, window) } : {}),
  },
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

const toSourceStats = ({ events }: StreamsUnit.StatsSourceResult): SourceStatsView => ({
  acceptedRate: events.accepted.rate.value,
});

const hasDestinationData = ({
  eventsRate,
  eventsTotal,
  failed,
  latencyAverage,
}: DestinationStatsView): boolean =>
  [eventsRate, eventsTotal, failed.total.rate, latencyAverage].some((value) => value !== null);

const hasProcessorData = ({ instances }: ProcessorStatsView): boolean => instances.length > 0;

const hasSourceData = ({ acceptedRate }: SourceStatsView): boolean => acceptedRate !== null;

/**
 * The one place that decides what a result means. A component error is an error, except
 * `not_found`, which is no data. A `0` is data. `null` is never data.
 *
 * An error next to real values means only a part of the stats could not be read, for example the
 * failure rates of a destination. That component is `ready`, and keeps its error for the UI to show.
 */
const classify = <TStats>(
  stats: TStats,
  hasData: (stats: TStats) => boolean,
  error?: StreamsUnit.StatsError
): MappedComponentStats<TStats> => {
  // `not_found` is no data, so it is not a failure.
  const failure = error?.code === NOT_FOUND_ERROR_CODE ? undefined : error;

  if (failure && !hasData(stats)) {
    return { status: 'error', stats, error: failure };
  }
  return {
    status: hasData(stats) ? 'ready' : 'noData',
    stats,
    ...(failure ? { error: failure } : {}),
  };
};

/** A destination that the response leaves out shows as no data. */
const mapDestinationResult = (
  result: StreamsUnit.StatsDestinationResult | undefined,
  window: StreamsUnit.StatsMeta['window']
): MappedComponentStats<DestinationStatsView> =>
  result
    ? classify(toDestinationStats(result, window), hasDestinationData, result.error)
    : classify(EMPTY_DESTINATION_STATS, hasDestinationData);

/** A processor that the response leaves out shows as no data. */
const mapProcessorResult = (
  result: StreamsUnit.StatsProcessorResult | undefined
): MappedComponentStats<ProcessorStatsView> =>
  result
    ? classify(toProcessorStats(result), hasProcessorData, result.error)
    : classify(EMPTY_PROCESSOR_STATS, hasProcessorData);

/** A source that the response leaves out shows as no data. */
const mapSourceResult = (
  result: StreamsUnit.StatsSourceResult | undefined
): MappedComponentStats<SourceStatsView> =>
  result
    ? classify(toSourceStats(result), hasSourceData, result.error)
    : classify(EMPTY_SOURCE_STATS, hasSourceData);

/** An id is user-defined, so `constructor` must not be read from `Object.prototype` as a result. */
const getOwnResult = <TResult>(results: Record<string, TResult>, id: string): TResult | undefined =>
  Object.hasOwn(results, id) ? results[id] : undefined;

/** What a request that failed gives to each component it asked for: an error with no numbers. */
export const mapFailedRequest = (
  requested: StreamsUnit.StatsComponentRef[],
  reason: string
): Pick<MappedStatsResponse, 'destinations' | 'processors' | 'sources'> => {
  const error: StreamsUnit.StatsError = { code: STATS_REQUEST_FAILED_ERROR_CODE, reason };
  const destinations: MappedStatsResponse['destinations'] = {};
  const processors: MappedStatsResponse['processors'] = {};
  const sources: MappedStatsResponse['sources'] = {};

  for (const { kind, id } of requested) {
    switch (kind) {
      case 'destination':
        destinations[id] = { status: 'error', stats: EMPTY_DESTINATION_STATS, error };
        break;
      case 'processor':
        processors[id] = { status: 'error', stats: EMPTY_PROCESSOR_STATS, error };
        break;
      case 'source':
        sources[id] = { status: 'error', stats: EMPTY_SOURCE_STATS, error };
        break;
      default:
        break;
    }
  }

  return { destinations, processors, sources };
};

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
  const sources: MappedStatsResponse['sources'] = {};

  for (const { kind, id } of requested) {
    switch (kind) {
      case 'destination':
        destinations[id] = mapDestinationResult(
          getOwnResult(components.destinations, id),
          meta.window
        );
        break;
      case 'processor':
        processors[id] = mapProcessorResult(getOwnResult(components.processors, id));
        break;
      case 'source':
        sources[id] = mapSourceResult(getOwnResult(components.sources, id));
        break;
      default:
        // A kind this UI does not know is dropped, so a new kind in the schema never breaks a node.
        break;
    }
  }

  return { destinations, processors, sources, window: meta.window };
};
