/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithInternalUserFactory } from '../../../lib/call_with_internal_user_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { Settings } from '../../../models/settings';

function fetchClusterSettings(callWithInternalUser) {
  return callWithInternalUser('cluster.getSettings', {
    includeDefaults: true,
    filterPath: '**.xpack.notification',
  });
}

export function registerLoadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);
  const callWithInternalUser = callWithInternalUserFactory(server);

  server.route({
    path: '/api/watcher/settings',
    method: 'GET',
    handler: () => {
      return fetchClusterSettings(callWithInternalUser)
        .then(settings => {
          return Settings.fromUpstreamJson(settings).downstreamJson;
        })
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            throw wrapEsError(err);
          }

          // Case: default
          throw wrapUnknownError(err);
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
