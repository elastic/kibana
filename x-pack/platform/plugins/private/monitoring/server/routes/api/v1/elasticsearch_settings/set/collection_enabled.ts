/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { putElasticsearchSettingsCollectionEnabledResponsePayloadRT } from '../../../../../../common/http_api/elasticsearch_settings';
import { setCollectionEnabled } from '../../../../../lib/elasticsearch_settings';
import { handleSettingsError } from '../../../../../lib/errors';
import { MonitoringCore } from '../../../../../types';

/*
 * Cluster Settings Check Route
 */
export function setCollectionEnabledRoute(server: MonitoringCore) {
  server.route({
    method: 'put',
    path: '/api/monitoring/v1/elasticsearch_settings/set/collection_enabled',
    validate: {},
    options: {
      access: 'internal',
    },
    async handler(req) {
      try {
        const response = await setCollectionEnabled(req);
        return putElasticsearchSettingsCollectionEnabledResponsePayloadRT.encode(response);
      } catch (err) {
        throw handleSettingsError(err);
      }
    },
  });
}
