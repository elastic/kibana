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

export class User {
  constructor(private log: ToolingLog, private kbnClient: KbnClient) {}

  public async create(username: string, user: any) {
    this.log.debug(`creating user ${username}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/users/${username}`,
      method: 'POST',
      body: {
        username,
        ...user,
      },
    });
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created user ${username}`);
  }

  public async delete(username: string) {
    this.log.debug(`deleting user ${username}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/users/${username}`,
      method: 'DELETE',
    });
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`deleted user ${username}`);
  }

  public async disable(username: string) {
    this.log.debug(`disabling user ${username}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/users/${encodeURIComponent(username)}/_disable`,
      method: 'POST',
    });
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`disabled user ${username}`);
  }

  public async enable(username: string) {
    this.log.debug(`enabling user ${username}`);
    const { data, status, statusText } = await this.kbnClient.request({
      path: `/internal/security/users/${encodeURIComponent(username)}/_enable`,
      method: 'POST',
    });
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`enabled user ${username}`);
  }
}
