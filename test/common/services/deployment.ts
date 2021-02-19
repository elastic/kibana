/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import fetch from 'node-fetch';
import { getUrl } from '@kbn/test';

import { FtrProviderContext } from '../ftr_provider_context';

export function DeploymentProvider({ getService }: FtrProviderContext) {
  const config = getService('config');

  return {
    /**
     * Returns Kibana host URL
     */
    getHostPort() {
      return getUrl.baseUrl(config.get('servers.kibana'));
    },

    /**
     * Returns ES host URL
     */
    getEsHostPort() {
      return getUrl.baseUrl(config.get('servers.elasticsearch'));
    },

    /**
     * Helper to detect an OSS licensed Kibana
     * Useful for functional testing in cloud environment
     */
    async isOss() {
      return config.get('kbnTestServer.serverArgs').indexOf('--oss') > -1;
    },

    async isCloud(): Promise<boolean> {
      const baseUrl = this.getHostPort();
      const username = config.get('servers.kibana.username');
      const password = config.get('servers.kibana.password');
      const response = await fetch(baseUrl + '/api/stats?extended', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
        },
      });
      const data = await response.json();
      return get(data, 'usage.cloud.is_cloud_enabled', false);
    },
  };
}
