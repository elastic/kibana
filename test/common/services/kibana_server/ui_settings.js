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

import Wreck from 'wreck';
import { get } from 'lodash';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export class KibanaServerUiSettings {
  constructor(url, log, kibanaVersion) {
    this._log = log;
    this._kibanaVersion = kibanaVersion;
    this._wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      json: true,
      redirects: 3,
    });
  }

  /*
  ** Gets defaultIndex from the config doc.
  */
  async getDefaultIndex() {
    const { payload } = await this._wreck.get('/api/kibana/settings');
    const defaultIndex = get(payload, 'settings.defaultIndex.userValue');
    this._log.verbose('uiSettings.defaultIndex: %j', defaultIndex);
    return defaultIndex;
  }

  /**
   *  Sets the auto-hide timeout to 1 hour so that auto-hide is
   *  effectively disabled. This gives the tests more time to
   *  interact with the notifications without having to worry about
   *  them disappearing if the tests are too slow.
   *
   *  @return {Promise<undefined>}
   */
  async disableToastAutohide() {
    await this.update({
      'notifications:lifetime:banner': HOUR,
      'notifications:lifetime:error': HOUR,
      'notifications:lifetime:warning': HOUR,
      'notifications:lifetime:info': HOUR,
    });
  }

  async replace(doc) {
    const { payload } = await this._wreck.get('/api/kibana/settings');

    for (const key of Object.keys(payload.settings)) {
      await this._wreck.delete(`/api/kibana/settings/${key}`);
    }

    this._log.debug('replacing kibana config doc: %j', doc);

    await this._wreck.post('/api/kibana/settings', {
      payload: {
        changes: doc
      }
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
        changes: updates
      }
    });
  }
}
