/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { isFunction } from 'lodash';
import { ALERT_TYPE_LICENSE_EXPIRATION } from '../../../../../common/constants';

async function createAlerts(alertsClient, { selectedEmailActionId, clusterUuid }) {
  const createdAlerts = [];

  // Create alerts
  const ALERT_TYPES = {
    [ALERT_TYPE_LICENSE_EXPIRATION]: {
      alertTypeParams: {
        clusterUuid,
      },
      actions: [
        {
          group: 'default',
          id: selectedEmailActionId,
          params: {
            subject: '{{context.subject}}',
            message: `{{context.message}}`,
            to: ['{{context.to}}']
          }
        }
      ]
    }
  };

  for (const alertTypeId of Object.keys(ALERT_TYPES)) {
    const result = await alertsClient.create({
      data: {
        enabled: true,
        interval: '1m',
        alertTypeId,
        ...ALERT_TYPES[alertTypeId],
      }
    });
    createdAlerts.push(result);
  }

  return createdAlerts;
}

// async function blacklistClusterAlertsIfAvailable(req) {
//   const BLACKLIST = {
//     'cluster_alerts.management.blacklist': CLUSTER_ALERTS_TO_BLACKLIST
//   };

//   const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
//   const readResponse = await callWithRequest(req, 'cluster.getSettings', {
//     includeDefaults: true
//   });

//   const exporters = {
//     persistent: {},
//     transient: {}
//   };

//   for (const source of ['persistent', 'transient', 'defaults']) {
//     const sourcedExporters = get(readResponse[source], 'xpack.monitoring.exporters');
//     if (sourcedExporters) {
//       const newSource = source === 'defaults' ? 'persistent' : source;
//       exporters[newSource] = {
//         xpack: {
//           monitoring: {
//             exporters: Object.keys(sourcedExporters).reduce((accum, exporterName) => ({
//               ...accum,
//               [exporterName]: {
//                 ...sourcedExporters[exporterName],
//                 ...BLACKLIST
//               }
//             }), {})
//           }
//         }
//       };
//     }
//   }

//   if (Object.keys(exporters.persistent).length === 0 && Object.keys(exporters.transient).length === 0) {
//     // Add a local one, as it is the default
//     exporters.persistent = {
//       xpack: {
//         monitoring: {
//           exporters: {
//             local: {
//               type: 'local',
//               ...BLACKLIST
//             }
//           }
//         }
//       }
//     }
//   }

//   await callWithRequest(req, 'cluster.putSettings', {
//     body: exporters
//   });
// }

export function createKibanaAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/alerts',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          selectedEmailActionId: Joi.string().required(),
        })
      }
    },
    async handler(req, headers) {
      const alertsClient = isFunction(req.getAlertsClient) ? req.getAlertsClient() : null;
      if (!alertsClient) {
        return headers.response().code(404);
      }

      // await blacklistClusterAlertsIfAvailable(req);
      const alerts = await createAlerts(alertsClient, { ...req.params, ...req.payload });
      return { alerts };
    }
  });
}
