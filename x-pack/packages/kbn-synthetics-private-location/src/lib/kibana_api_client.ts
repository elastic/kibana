/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import fs from 'fs';
import { Agent } from 'undici';

export class KibanaAPIClient {
  private dispatcher: Agent | undefined;

  constructor(
    private kibanaUrl: string,
    private kibanaUsername: string,
    private kibanaPassword: string,
    private logger: ToolingLog
  ) {
    const isHTTPS = new URL(kibanaUrl).protocol === 'https:';
    this.dispatcher = isHTTPS
      ? new Agent({
          connect: {
            ca: fs.readFileSync(KBN_CERT_PATH).toString(),
            key: fs.readFileSync(KBN_KEY_PATH).toString(),
            rejectUnauthorized: false,
          },
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
    const basicAuth = Buffer.from(`${this.kibanaUsername}:${this.kibanaPassword}`).toString(
      'base64'
    );

    try {
      const response = await fetch(`${this.kibanaUrl}/${url}`, {
        method,
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'content-type': 'application/json',
          ...((headers as Record<string, string>) ?? {}),
          Authorization: `Basic ${basicAuth}`,
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
        ...(this.dispatcher ? ({ dispatcher: this.dispatcher } as RequestInit) : {}),
      });

      const responseData = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}: ${JSON.stringify(responseData)}`
        );
      }

      return {
        status: response.status,
        data: responseData,
        headers: response.headers,
      };
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
