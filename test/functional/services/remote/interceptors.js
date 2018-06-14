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

import { modifyUrl } from '../../../../src/utils';

export const createRemoteInterceptors = remote => ({
  // inject _t=Date query param on navigation
  async get(url, insertTimestamp = true) {
    if (insertTimestamp) {
      const urlWithTime = modifyUrl(url, parsed => {
        parsed.query._t = Date.now();
      });

      return await remote.get(urlWithTime);
    }
    return await remote.get(url);
  },

  // strip _t=Date query param when url is read
  async getCurrentUrl() {
    const current = await remote.getCurrentUrl();
    const currentWithoutTime = modifyUrl(current, parsed => {
      delete parsed.query._t;
    });
    return currentWithoutTime;
  }
});
