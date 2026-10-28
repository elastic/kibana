/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { noDestinationStats } from './mappers/map_destination_stats_result';
import { noProcessorStats } from './mappers/map_processor_stats_result';
import { UnitStatsError } from './errors/unit_stats_error';

/**
 * Checks a requested destination against the unit config alone, so it makes no
 * Elasticsearch call. A destination that is not in the unit gets an error and is not
 * queryable. Any other destination, whatever its type, starts as a no data result, and the
 * search fills it in when the destination emits metrics.
 */
export const validateDestination = ({
  config,
  bucketMs,
}: {
  config: object | undefined;
  bucketMs: number;
}): { result: StreamsUnit.StatsDestinationResult; queryable: boolean } => {
  if (!config) {
    return {
      result: {
        ...noDestinationStats(bucketMs),
        error: UnitStatsError.notFound('destination').toStatsError(),
      },
      queryable: false,
    };
  }
  return { result: noDestinationStats(bucketMs), queryable: true };
};

/** Checks a requested processor against the unit config alone. */
export const validateProcessor = ({
  config,
}: {
  config: object | undefined;
}): { result: StreamsUnit.StatsProcessorResult; queryable: boolean } =>
  config
    ? { result: noProcessorStats(), queryable: true }
    : {
        result: {
          ...noProcessorStats(),
          error: UnitStatsError.notFound('processor').toStatsError(),
        },
        queryable: false,
      };
