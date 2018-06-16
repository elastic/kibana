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

import { resolve as resolveUrl } from 'url';

import { fromNode } from 'bluebird';
import Wreck from 'wreck';

const get = async (url) => fromNode(cb => {
  Wreck.get(url, { json: 'force' }, (err, resp, payload) => {
    cb(err, payload); // resp is an Http#IncomingMessage, payload is the parsed version
  });
});

export class KibanaServerStatus {
  constructor(kibanaServerUrl) {
    this.kibanaServerUrl = kibanaServerUrl;
  }

  async get() {
    return await get(resolveUrl(this.kibanaServerUrl, './api/status'));
  }

  async getOverallState() {
    const status = await this.get();
    return status.status.overall.state;
  }
}
