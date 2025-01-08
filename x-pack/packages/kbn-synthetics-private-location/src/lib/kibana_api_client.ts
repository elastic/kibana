/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import fs from 'fs';
import https, { Agent } from 'https';
import axios from 'axios';

export class KibanaAPIClient {
  private isHTTPS: boolean;
  private httpsAgent: Agent | undefined;

  constructor(
    private kibanaUrl: string,
    private kibanaUsername: string,
    private kibanaPassword: string,
    private logger: ToolingLog
  ) {
    this.isHTTPS = new URL(kibanaUrl).protocol === 'https:';
    this.httpsAgent = this.isHTTPS
      ? new https.Agent({
          ca: fs.readFileSync(KBN_CERT_PATH),
          key: fs.readFileSync(KBN_KEY_PATH),
          // hard-coded set to false like in packages/kbn-cli-dev-mode/src/base_path_proxy_server.ts
          rejectUnauthorized: false,
        })
      : undefined;
  }

  public async sendRequest({
    method,
    url,
    data,
    headers,
  }: {
    method: string;
    url: string;
    data?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }) {
    try {
      const response = await axios({
        method,
        url: `${this.kibanaUrl}/${url}`,
        data,
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          ...headers,
        },
        auth: {
          username: this.kibanaUsername,
          password: this.kibanaPassword,
        },
        httpsAgent: this.httpsAgent,
      });
      return response;
    } catch (e) {
      if (isError(e)) {
        this.logger.error(`Error sending request to Kibana: ${e.message} ${e.stack}`);
      }
      throw e;
    }
  }

  public async getKibanaVersion() {
    const res = await this.sendRequest({ method: 'GET', url: 'api/status' });
    return res.data.version.number;
  }
}
