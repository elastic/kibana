/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { timeValueToMs } from '../../common/time_value';
import type { BoostRuleMatch, DataRetention } from '../../common/types';

export type TargetDetails = Pick<BoostRuleMatch, 'storageSizeInBytes' | 'retention'>;

export interface MeteringStats {
  name: string;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  indices?: MeteringStats[];
  datastreams?: MeteringStats[];
}

export const toRetention = (
  lifecycle: estypes.IndicesDataStream['lifecycle']
): DataRetention | undefined => {
  if (!lifecycle || lifecycle.enabled === false) {
    return { type: 'disabled' };
  }
  const value = lifecycle.effective_retention?.toString();
  if (value === undefined) {
    return { type: 'infinite' };
  }
  const inMilliseconds = timeValueToMs(value);
  return Number.isNaN(inMilliseconds) ? undefined : { type: 'value', value, inMilliseconds };
};

// Sizes only fill a column, so a slow `_metering/stats` costs the sizes rather than the page.
const METERING_TIMEOUT_MS = 5_000;

// `_stats/store` returns 410 in serverless, so sizes come from `_metering/stats`, as in Index
// Management. It's an internal API, so a failure only leaves the sizes out.
export const getStorageSizes = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<MeteringStats[]> => {
  let secondaryAuthClient: ElasticsearchClient;
  try {
    secondaryAuthClient = client.asSecondaryAuthUser;
  } catch (error) {
    // Thrown when the request has no `authorization` header to pass on.
    logger.debug(`Unable to load storage sizes: ${error.message}`);
    return [];
  }

  try {
    const { indices = [], datastreams = [] } =
      await secondaryAuthClient.transport.request<MeteringStatsResponse>(
        { method: 'GET', path: '/_metering/stats/*' },
        { requestTimeout: METERING_TIMEOUT_MS }
      );
    return [...indices, ...datastreams];
  } catch (error) {
    // Users without the privileges are expected; anything else may be a real problem.
    const isForbidden =
      error instanceof errors.ResponseError && [401, 403].includes(error.statusCode ?? 0);
    logger[isForbidden ? 'debug' : 'warn'](`Unable to load storage sizes: ${error.message}`);
    return [];
  }
};

export const getTargetDetails = (
  storageSizes: MeteringStats[],
  dataStreams: estypes.IndicesDataStream[]
): Map<string, TargetDetails> => {
  const details = new Map<string, TargetDetails>();
  storageSizes.forEach(({ name, size_in_bytes: storageSizeInBytes }) =>
    details.set(name, { storageSizeInBytes })
  );
  dataStreams.forEach(({ name, lifecycle }) =>
    details.set(name, { ...details.get(name), retention: toRetention(lifecycle) })
  );
  return details;
};
