/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface HttpOptions {
  baseURL?: string;
  url?: string;
  responseType: 'stream' | 'text';
}

export interface HttpAdapter {
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
}
