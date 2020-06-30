/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { get } from 'lodash';
import { KIBANA_SETTINGS_TYPE } from '../../../../../../../plugins/monitoring/common/constants';

const getClusterUuid = async (callCluster) => {
  const { cluster_uuid: uuid } = await callCluster('info', { filterPath: 'cluster_uuid' });
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

        const snapshotRegex = /-snapshot/i;
        const config = server.config();
        const status = kbnServer.status.toJSON();
        const kibana = {
          uuid: config.get('server.uuid'),
          name: config.get('server.name'),
          index: config.get('kibana.index'),
          host: config.get('server.host'),
          port: config.get('server.port'),
          locale: config.get('i18n.locale'),
          transport_address: `${config.get('server.host')}:${config.get('server.port')}`,
          version: kbnServer.version.replace(snapshotRegex, ''),
          snapshot: snapshotRegex.test(kbnServer.version),
          status: get(status, 'overall.state'),
        };

        return {
          cluster_uuid: uuid,
          settings: {
            ...settings,
            kibana,
          },
        };
      } catch (err) {
        req.log(['error'], err); // FIXME doesn't seem to log anything useful if ES times out
        if (err.isBoom) {
          return err;
        } else {
          return boomify(err, { statusCode: err.statusCode, message: err.message });
        }
      }
    },
  });
}
