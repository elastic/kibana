/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import type { Elasticsearch, Kibana } from '..';
export { AbortError } from './abort_error';

export async function callKibana<T>({
  elasticsearch,
  kibana,
  options,
}: {
  elasticsearch: Omit<Elasticsearch, 'node'>;
  kibana: Kibana;
  options: {
    method?: string;
    url?: string;
    data?: unknown;
    headers?: Record<string, string>;
  };
}): Promise<T> {
  const baseUrl = await getBaseUrl(kibana.hostname);
  const { username, password } = elasticsearch;

  const method = options.method ?? 'GET';
  const url = `${baseUrl}${options.url ?? ''}`;
  const headers: Record<string, string> = {
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'kibana',
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options.data !== undefined) {
    fetchOptions.body = JSON.stringify(options.data);
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new FetchError(
      `Request to ${url} failed with status ${response.status} ${response.statusText}`,
      response.status
    );
  }
  const data = await response.json();
  return data;
}

const getBaseUrl = once(async (kibanaHostname: string) => {
  try {
    const response = await fetch(kibanaHostname, {
      redirect: 'manual',
      headers: { 'x-elastic-internal-origin': 'kibana' },
    });
    const location = response.headers.get('location') ?? '';
    const hasBasePath = RegExp(/^\/\w{3}$/).test(location);
    const basePath = hasBasePath ? location : '';
    return `${kibanaHostname}${basePath}`;
  } catch (e) {
    return kibanaHostname;
  }
});

export class FetchError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isFetchError(e: unknown): e is FetchError {
  return e instanceof FetchError;
}
