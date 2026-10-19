/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { DESTINATION_TYPES_WITH_STATS } from './constants';
import { noDestinationStats } from './map_destination_stats_response';
import { noProcessorStats } from './map_processor_stats_response';
import {
  DESTINATION_NOT_FOUND_ERROR,
  DESTINATION_UNSUPPORTED_ERROR,
  PROCESSOR_NOT_FOUND_ERROR,
} from './stats_errors';

/**
 * Checks a requested destination against the unit config alone, so it makes no
 * Elasticsearch call. A destination that is missing or emits no stats gets an error and is
 * not queryable. Otherwise it starts as a no data result, and the search fills it in.
 */
export const validateDestination = ({
  config,
  bucketMs,
}: {
  config: { type: string } | undefined;
  bucketMs: number;
}): { result: StreamsUnit.StatsDestinationResult; queryable: boolean } => {
  if (!config) {
    return {
      result: { ...noDestinationStats(bucketMs), error: DESTINATION_NOT_FOUND_ERROR },
      queryable: false,
    };
  }
  if (!DESTINATION_TYPES_WITH_STATS.includes(config.type)) {
    return {
      result: { ...noDestinationStats(bucketMs), error: DESTINATION_UNSUPPORTED_ERROR },
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
    : { result: { ...noProcessorStats(), error: PROCESSOR_NOT_FOUND_ERROR }, queryable: false };
