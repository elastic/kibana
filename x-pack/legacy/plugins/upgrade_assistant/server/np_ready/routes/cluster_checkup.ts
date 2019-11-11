/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';

import { ServerShim } from '../types';
import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';
import { EsVersionPrecheck } from '../lib/es_version_precheck';

import { createRequestShim } from './create_request_shim';

export function registerClusterCheckupRoutes(server: ServerShim) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const isCloudEnabled = _.get(server.plugins, 'cloud.config.isCloudEnabled', false);

  server.route({
    path: '/api/upgrade_assistant/status',
    method: 'GET',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      const reqShim = createRequestShim(request);
      try {
        return await getUpgradeAssistantStatus(callWithRequest, reqShim, isCloudEnabled);
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });
}
