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
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
  }
}
