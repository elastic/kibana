/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { LegacyRequest } from '../../types';
import { getClustersStats } from './get_clusters_stats';

/**
 * This will fetch the cluster stats and cluster state as a single object for the cluster specified by the {@code req}.
 *
 * @param {Object} req The incoming user's request
 * @param {String} clusterUuid The requested cluster's UUID
 * @return {Promise} The object cluster response.
 */
export function getClusterStats(req: LegacyRequest, clusterUuid: string) {
  if (!clusterUuid) {
    throw badRequest(
      i18n.translate('xpack.monitoring.clusterStats.uuidNotSpecifiedErrorMessage', {
        defaultMessage: '{clusterUuid} not specified',
        values: { clusterUuid: 'clusterUuid' },
      })
    );
  }

  // passing clusterUuid so `get_clusters` will filter for single cluster
  return getClustersStats(req, clusterUuid).then((clusters) => {
    if (!clusters || clusters.length === 0) {
      throw notFound(
        i18n.translate('xpack.monitoring.clusterStats.uuidNotFoundErrorMessage', {
          defaultMessage:
            'Unable to find the cluster in the selected time range. UUID: {clusterUuid}',
          values: {
            clusterUuid,
          },
        })
      );
    }

    return clusters[0];
  });
}
