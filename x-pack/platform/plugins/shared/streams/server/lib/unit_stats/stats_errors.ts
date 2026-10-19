/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

/** The response schema leaves `code` an open string, so the codes live here. */
export const STATS_ERROR_CODE = {
  notFound: 'not_found',
  unsupported: 'unsupported',
  forbidden: 'forbidden',
  unavailable: 'unavailable',
  timeout: 'timeout',
  error: 'error',
} as const;

/** From the unit config alone. */
export const DESTINATION_NOT_FOUND_ERROR: StreamsUnit.StatsError = {
  code: STATS_ERROR_CODE.notFound,
  reason: 'No destination with this id in the unit.',
};

export const PROCESSOR_NOT_FOUND_ERROR: StreamsUnit.StatsError = {
  code: STATS_ERROR_CODE.notFound,
  reason: 'No processor with this id in the unit.',
};

export const DESTINATION_UNSUPPORTED_ERROR: StreamsUnit.StatsError = {
  code: STATS_ERROR_CODE.unsupported,
  reason: 'Destination type does not emit stats.',
};

/** From a failed search. `reason` never holds a raw Elasticsearch body. */
export const FORBIDDEN_ERROR: StreamsUnit.StatsError = {
  code: STATS_ERROR_CODE.forbidden,
  reason: 'The current user cannot read the stats stream.',
};

export const UNAVAILABLE_ERROR: StreamsUnit.StatsError = {
  code: STATS_ERROR_CODE.unavailable,
  reason: 'Elasticsearch could not serve the stats query.',
};

export const timeoutError = (what: string): StreamsUnit.StatsError => ({
  code: STATS_ERROR_CODE.timeout,
  reason: `The ${what} query timed out.`,
});

export const failedError = (what: string): StreamsUnit.StatsError => ({
  code: STATS_ERROR_CODE.error,
  reason: `The ${what} query failed.`,
});
