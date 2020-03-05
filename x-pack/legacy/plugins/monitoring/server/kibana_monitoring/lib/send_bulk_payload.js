/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { chunk, get } from 'lodash';
import {
  MONITORING_SYSTEM_API_VERSION,
  KIBANA_SYSTEM_ID,
  KIBANA_STATS_TYPE_MONITORING,
  KIBANA_SETTINGS_TYPE,
} from '../../../common/constants';

const SUPPORTED_TYPES = [KIBANA_STATS_TYPE_MONITORING, KIBANA_SETTINGS_TYPE];
export function formatForNormalBulkEndpoint(payload, productionClusterUuid) {
  const dateSuffix = moment.utc().format('YYYY.MM.DD');
  return chunk(payload, 2).reduce((accum, chunk) => {
    const type = get(chunk[0], 'index._type');
    if (!type || !SUPPORTED_TYPES.includes(type)) {
      return accum;
    }

    const { timestamp } = chunk[1];

    accum.push({
      index: {
        _index: `.monitoring-kibana-${MONITORING_SYSTEM_API_VERSION}-${dateSuffix}`,
      },
    });
    accum.push({
      [type]: chunk[1],
      type,
      timestamp,
      cluster_uuid: productionClusterUuid,
    });
    return accum;
  }, []);
}

/*
 * Send the Kibana usage data to the ES Monitoring Bulk endpoint
 */
export async function sendBulkPayload(
  cluster,
  interval,
  payload,
  log,
  hasDirectConnectionToMonitoringCluster = false,
  productionClusterUuid = null
) {
  if (hasDirectConnectionToMonitoringCluster) {
    if (productionClusterUuid === null) {
      log.warn(
        `Unable to determine production cluster uuid to use for shipping monitoring data. Kibana monitoring data will appear in a standalone cluster in the Stack Monitoring UI.`
      );
    }
    const formattedPayload = formatForNormalBulkEndpoint(payload, productionClusterUuid);
    return await cluster.callWithInternalUser('bulk', {
      body: formattedPayload,
    });
  }

  return cluster.callWithInternalUser('monitoring.bulk', {
    system_id: KIBANA_SYSTEM_ID,
    system_api_version: MONITORING_SYSTEM_API_VERSION,
    interval: interval + 'ms',
    body: payload,
  });
}
