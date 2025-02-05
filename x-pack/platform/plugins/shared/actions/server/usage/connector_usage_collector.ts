/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError, AxiosResponse } from 'axios';
import { Logger } from '@kbn/core/server';
import { isUndefined } from 'lodash';

interface ConnectorUsage {
  requestBodyBytes: number;
}

export class ConnectorUsageCollector {
  private connectorId: string;
  private usage: ConnectorUsage = {
    requestBodyBytes: 0,
  };

  private logger: Logger;

  constructor({ logger, connectorId }: { logger: Logger; connectorId: string }) {
    this.logger = logger;
    this.connectorId = connectorId;
  }

  public addRequestBodyBytes(result?: AxiosError | AxiosResponse, body: string | object = '') {
    const contentLength = result?.request?.getHeader('content-length');
    let bytes = 0;

    if (!isUndefined(contentLength)) {
      bytes = parseInt(contentLength, 10);
    } else {
      try {
        const sBody = typeof body === 'string' ? body : JSON.stringify(body);
        bytes = Buffer.byteLength(sBody, 'utf8');
      } catch (e) {
        this.logger.error(
          `Request body bytes couldn't be calculated, Error: ${e.message}, connectorId:${this.connectorId}`
        );
      }
    }

    this.usage.requestBodyBytes = this.usage.requestBodyBytes + bytes;
  }

  public getRequestBodyByte() {
    return this.usage.requestBodyBytes;
  }
}
