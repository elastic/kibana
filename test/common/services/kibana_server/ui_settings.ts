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

import Axios from 'axios';
import { get } from 'lodash';
import { Lifecycle } from '@kbn/test/types/ftr';

import { ToolingLog } from '@kbn/dev-utils';

export class KibanaServerUiSettings {
  private readonly x = Axios.create({
    baseURL: this.url,
  });

  constructor(
    private readonly url: string,
    private readonly log: ToolingLog,
    private readonly defaults: Record<string, any>,
    private readonly lifecycle: Lifecycle
  ) {
    if (this.defaults) {
      this.lifecycle.on('beforeTests', async () => {
        await this.update(defaults);
      });
    }
  }

  /**
   * Gets defaultIndex from the config doc.
   */
  async getDefaultIndex() {
    const { data } = await this.x.get('/api/kibana/settings');
    const defaultIndex = get(data, 'settings.defaultIndex.userValue');
    this.log.verbose('uiSettings.defaultIndex: %j', defaultIndex);
    return defaultIndex;
  }

  async replace(doc: Record<string, any>) {
    const { data } = await this.x.get('/api/kibana/settings');

    for (const key of Object.keys(data.settings)) {
      if (!data.settings[key].isOverridden) {
        await this.x.delete(`/api/kibana/settings/${key}`);
      }
    }

    this.log.debug('replacing kibana config doc: %j', doc);

    await this.x.post('/api/kibana/settings', {
      data: {
        changes: {
          ...this.defaults,
          ...doc,
        },
      },
    });
  }

  /**
   * Add fields to the config doc (like setting timezone and defaultIndex)
   */
  async update(updates: Record<string, any>) {
    this.log.debug('applying update to kibana config: %j', updates);
    await this.x.post('/api/kibana/settings', {
      data: {
        changes: updates,
      },
    });
  }
}
