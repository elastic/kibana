/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Duplex } from 'stream';
import { HttpAdapter as HttpAdapterType, HttpOptions } from './adapter_type';

/**
 * In memory http adapter for test purpose
 */
export class InMemoryHttpAdapter implements HttpAdapterType {
  public responses: { [key: string]: any } = {};

  get(
    options: HttpOptions & {
      responseType: 'stream';
    }
  ): Promise<NodeJS.ReadableStream>;

  get(
    options: HttpOptions & {
      responseType: 'text';
    }
  ): Promise<string>;
  public async get(
    options: (HttpOptions & { responseType: 'text' }) | (HttpOptions & { responseType: 'stream' })
  ): Promise<NodeJS.ReadableStream | string> {
    const key = `${options.baseURL || ''}/${options.url || ''}`;
    switch (options.responseType) {
      case 'stream':
        const stream = new Duplex();
        stream.push(this.responses[key]);
        stream.push(null);
        return stream;
      default:
        return this.responses[key] as string;
    }
  }
}
