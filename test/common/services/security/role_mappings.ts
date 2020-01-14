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

import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { ToolingLog } from '@kbn/dev-utils';

export class RoleMappings {
  private log: ToolingLog;
  private axios: AxiosInstance;

  constructor(url: string, log: ToolingLog) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/security/role_mappings' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async create(name: string, roleMapping: Record<string, any>) {
    this.log.debug(`creating role mapping ${name}`);
    const { data, status, statusText } = await this.axios.post(
      `/internal/security/role_mapping/${name}`,
      roleMapping
    );
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created role mapping ${name}`);
  }

  public async delete(name: string) {
    this.log.debug(`deleting role mapping ${name}`);
    const { data, status, statusText } = await this.axios.delete(
      `/internal/security/role_mapping/${name}`
    );
    if (status !== 200 && status !== 404) {
      throw new Error(
        `Expected status code of 200 or 404, received ${status} ${statusText}: ${util.inspect(
          data
        )}`
      );
    }
    this.log.debug(`deleted role mapping ${name}`);
  }
}
