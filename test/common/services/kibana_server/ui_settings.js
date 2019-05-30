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

import Wreck from '@hapi/wreck';
import { get } from 'lodash';

export class KibanaServerUiSettings {
  constructor(url, log, defaults, lifecycle) {
    this._log = log;
    this._defaults = defaults;
    this._wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      json: true,
      redirects: 3,
    });

    if (this._defaults) {
      lifecycle.on('beforeTests', async () => {
        await this.update(defaults);
      });
    }
  }

  /**
   * Gets defaultIndex from the config doc.
   */
  async getDefaultIndex() {
    const { payload } = await this._wreck.get('/api/kibana/settings');
    const defaultIndex = get(payload, 'settings.defaultIndex.userValue');
    this._log.verbose('uiSettings.defaultIndex: %j', defaultIndex);
    return defaultIndex;
  }

  async replace(doc) {
    const { payload } = await this._wreck.get('/api/kibana/settings');

    for (const key of Object.keys(payload.settings)) {
      if (!payload.settings[key].isOverridden) {
        await this._wreck.delete(`/api/kibana/settings/${key}`);
      }
    }

    this._log.debug('replacing kibana config doc: %j', doc);

    await this._wreck.post('/api/kibana/settings', {
      payload: {
        changes: {
          ...this._defaults,
          ...doc,
        },
      },
    });
  }

  /**
   * Add fields to the config doc (like setting timezone and defaultIndex)
   * @return {Promise} A promise that is resolved when elasticsearch has a response
   */
  async update(updates) {
    this._log.debug('applying update to kibana config: %j', updates);
    await this._wreck.post('/api/kibana/settings', {
      payload: {
        changes: updates,
      },
    });
  }
}
