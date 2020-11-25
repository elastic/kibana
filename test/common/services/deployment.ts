/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
// @ts-ignore
import fetch from 'node-fetch';
// @ts-ignore not TS yet
import getUrl from '../../../src/test_utils/get_url';

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
      const baseUrl = this.getEsHostPort();
      const username = config.get('servers.elasticsearch.username');
      const password = config.get('servers.elasticsearch.password');
      const response = await fetch(baseUrl + '/_xpack', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
        },
      });
      return response.status !== 200;
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
