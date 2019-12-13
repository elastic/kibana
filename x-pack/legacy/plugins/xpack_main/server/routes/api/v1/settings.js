/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { KIBANA_SETTINGS_TYPE } from '../../../../../monitoring/common/constants';
import { getKibanaInfoForStats } from '../../../../../monitoring/server/kibana_monitoring/lib';

const getClusterUuid = async callCluster => {
  const { cluster_uuid: uuid } = await callCluster('info', { filterPath: 'cluster_uuid', });
  return uuid;
};

export function settingsRoute(server, kbnServer) {
  server.route({
    path: '/api/settings',
    method: 'GET',
    async handler(req) {
      const { server } = req;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const callCluster = (...args) => callWithRequest(req, ...args); // All queries from HTTP API must use authentication headers from the request

      try {
        const { usageCollection } = server.newPlatform.setup.plugins;
        const settingsCollector = usageCollection.getCollectorByType(KIBANA_SETTINGS_TYPE);

        let settings = await settingsCollector.fetch(callCluster);
        if (!settings) {
          settings = settingsCollector.getEmailValueStructure(null);
        }
        const uuid = await getClusterUuid(callCluster);

        const kibana = getKibanaInfoForStats({
          kbnServerStatus: kbnServer.status,
          kbnServerVersion: kbnServer.version,
          config: server.config()
        });

        return {
          cluster_uuid: uuid,
          settings: {
            ...settings,
            kibana,
          }
        };
      } catch(err) {
        req.log(['error'], err); // FIXME doesn't seem to log anything useful if ES times out
        if (err.isBoom) {
          return err;
        } else {
          return boomify(err, { statusCode: err.statusCode, message: err.message });
        }
      }
    }
  });
}
