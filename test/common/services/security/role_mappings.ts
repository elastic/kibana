/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import util from 'util';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';

export class RoleMappings {
  constructor(private log: ToolingLog, private kbnClient: KbnClient) {}

  public async getAll() {
    this.log.debug(`Getting role mappings`);
    const { data, status, statusText } = await this.kbnClient.request<Array<{ name: string }>>({
      path: `/internal/security/role_mapping`,
      method: 'GET',
    });
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    return data;
  }

  public async create(name: string, roleMapping: Record<string, any>) {
    this.log.debug(`creating role mapping ${name}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/role_mapping/${encodeURIComponent(name)}`,
      method: 'POST',
      body: roleMapping,
    });
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created role mapping ${name}`);
  }

  public async delete(name: string) {
    this.log.debug(`deleting role mapping ${name}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/role_mapping/${encodeURIComponent(name)}`,
      method: 'DELETE',
    });
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
