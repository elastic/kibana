/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import moment from 'moment-timezone';
import { IScopedClusterClient } from '@kbn/core/server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { DeprecationLoggingStatus } from '../../common/types';
import {
  DEPRECATION_LOGS_INDEX,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  APPS_WITH_DEPRECATION_LOGS,
  RECENT_DURATION_MS,
} from '../../common/constants';

export async function getDeprecationLoggingStatus(
  dataClient: IScopedClusterClient
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.asCurrentUser.cluster.getSettings({
    include_defaults: true,
  });

  return {
    isDeprecationLogIndexingEnabled: isDeprecationLogIndexingEnabled(response),
    isDeprecationLoggingEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function setDeprecationLogging(
  dataClient: IScopedClusterClient,
  isEnabled: boolean
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.asCurrentUser.cluster.putSettings({
    persistent: {
      'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
      'cluster.deprecation_indexing.enabled': isEnabled,
    },
    /*
     * If we only set the persistent setting, we can end up in a situation in which a user has
     * set transient on/off. And when toggling and reloading the page the transient setting will
     * have priority over it thus "overriding" whatever the user selected.
     */
    transient: {
      'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
      'cluster.deprecation_indexing.enabled': isEnabled,
    },
  });

  return {
    isDeprecationLogIndexingEnabled: isEnabled,
    isDeprecationLoggingEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function getRecentEsDeprecationLogs(
  dataClient: IScopedClusterClient,
  timeframeMsec: number = RECENT_DURATION_MS
) {
  const indexExists = await dataClient.asCurrentUser.indices.exists({
    index: DEPRECATION_LOGS_INDEX,
  });

  if (!indexExists) {
    return { logs: [], count: 0 };
  }

  const now = moment();
  const from = moment().subtract(timeframeMsec, 'milliseconds');

  try {
    const searchResponse = await dataClient.asCurrentUser.search({
      index: DEPRECATION_LOGS_INDEX,
      query: {
        bool: {
          must: {
            range: {
              '@timestamp': {
                gte: from.toISOString(),
                lte: now.toISOString(),
              },
            },
          },
          must_not: {
            terms: {
              [DEPRECATION_LOGS_ORIGIN_FIELD]: [...APPS_WITH_DEPRECATION_LOGS],
            },
          },
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const logs = searchResponse.hits.hits.map((hit) => hit._source);

    return {
      logs,
      count: (searchResponse.hits.total as SearchTotalHits)?.value,
    };
  } catch (error) {
    // If search fails, return empty results to avoid blocking the overall status
    return { logs: [], count: 0 };
  }
}

export function isDeprecationLogIndexingEnabled(settings: any) {
  const clusterDeprecationLoggingEnabled = ['defaults', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'cluster', 'deprecation_indexing', 'enabled'], currentLogLevel),
    'false'
  );

  return clusterDeprecationLoggingEnabled === 'true';
}

export function isDeprecationLoggingEnabled(settings: any) {
  const deprecationLogLevel = ['defaults', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'logger', 'deprecation'], currentLogLevel),
    'WARN'
  );

  return ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN'].includes(deprecationLogLevel);
}
