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

import util from 'util';
import { KbnClient, ToolingLog } from '@kbn/dev-utils';

export class Role {
  constructor(private log: ToolingLog, private kibanaServer: KbnClient) {}

  public async create(name: string, role: any) {
    this.log.debug(`creating role ${name}`);
    const { data, status, statusText } = await this.kibanaServer.request({
      path: `/api/security/role/${name}`,
      method: 'PUT',
      body: role,
      retries: 0,
    });
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
  }

  public async delete(name: string) {
    this.log.debug(`deleting role ${name}`);
    const { data, status, statusText } = await this.kibanaServer.request({
      path: `/api/security/role/${name}`,
      method: 'DELETE',
    });
    if (status !== 204 && status !== 404) {
      throw new Error(
        `Expected status code of 204 or 404, received ${status} ${statusText}: ${util.inspect(
          data
        )}`
      );
    }
  }
}
