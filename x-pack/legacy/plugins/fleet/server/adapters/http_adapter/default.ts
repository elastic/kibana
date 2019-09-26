/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance } from 'axios';
import { HttpAdapter as HttpAdapterType, HttpOptions } from './adapter_type';

/**
 * Basic http adapter to make external request
 */
export class HttpAdapter implements HttpAdapterType {
  private readonly client: AxiosInstance;
  constructor() {
    this.client = axios.create();
  }

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
    const res = await this.client(options);

    switch (options.responseType) {
      case 'stream':
        return res.data as NodeJS.ReadableStream;
      default:
        return res.data as string;
    }
  }
}
