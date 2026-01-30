/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import type { Root } from '@kbn/core-root-server-internal';
import type { ToolingLog } from '@kbn/tooling-log';
import fetch, { type RequestInit, type Response } from 'node-fetch';

export interface HttpClientOptions {
  baseUrl: string;
  username: string;
  password: string;
  log: ToolingLog;
  isJsonMode: boolean;
  root?: Root;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  version?: string;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly log: ToolingLog;
  private readonly isJsonMode: boolean;
  private readonly root?: Root;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.log = options.log;
    this.isJsonMode = options.isJsonMode;
    this.root = options.root;

    const credentials = Buffer.from(`${options.username}:${options.password}`);
    this.authHeader = `Basic ${credentials.toString('base64')}`;
  }

  async request<T = unknown>(options: RequestOptions): Promise<HttpResponse<T>> {
    const { method, path, body, query, version } = options;

    // Build URL with query parameters
    let url = path;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Use supertest for in-process requests, fetch for external
    if (this.root) {
      return this.requestWithSupertest<T>({ method, path: url, body, version });
    }
    return this.requestWithFetch<T>({ method, path: url, body, version });
  }

  private async requestWithSupertest<T>(
    options: Omit<RequestOptions, 'query'>
  ): Promise<HttpResponse<T>> {
    const { method, path, body, version } = options;

    // Access the internal HTTP server
    const listener = (this.root as any).server.http.httpServer.server.listener;
    let req = supertest(listener)[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](path)
      .set('Authorization', this.authHeader)
      .set('kbn-xsrf', 'true');

    // Add version header for public API routes
    if (version) {
      req = req.set('Elastic-Api-Version', version);
    }

    if (body) {
      req = req.send(body);
    }

    const response = await req;

    return {
      status: response.status,
      data: response.body as T,
    };
  }

  private async requestWithFetch<T>(
    options: Omit<RequestOptions, 'query'>
  ): Promise<HttpResponse<T>> {
    const { method, path, body, version } = options;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
    };

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body) {
      init.body = JSON.stringify(body);
    }

    const response: Response = await fetch(`${this.baseUrl}${path}`, init);
    const data = (await response.json()) as T;

    return {
      status: response.status,
      data,
    };
  }

  // Convenience methods for public API routes (versioned)
  async getPublic<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T> {
    const response = await this.request<T>({
      method: 'GET',
      path,
      query,
      version: '2023-10-31',
    });
    this.checkResponse(response);
    return response.data;
  }

  async postPublic<T = unknown>(
    path: string,
    body?: unknown,
    query?: RequestOptions['query']
  ): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      path,
      body,
      query,
      version: '2023-10-31',
    });
    this.checkResponse(response);
    return response.data;
  }

  async putPublic<T = unknown>(
    path: string,
    body?: unknown,
    query?: RequestOptions['query']
  ): Promise<T> {
    const response = await this.request<T>({
      method: 'PUT',
      path,
      body,
      query,
      version: '2023-10-31',
    });
    this.checkResponse(response);
    return response.data;
  }

  async deletePublic<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T> {
    const response = await this.request<T>({
      method: 'DELETE',
      path,
      query,
      version: '2023-10-31',
    });
    this.checkResponse(response);
    return response.data;
  }

  // Convenience methods for internal routes (no version)
  async getInternal<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T> {
    const response = await this.request<T>({
      method: 'GET',
      path,
      query,
    });
    this.checkResponse(response);
    return response.data;
  }

  async postInternal<T = unknown>(
    path: string,
    body?: unknown,
    query?: RequestOptions['query']
  ): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      path,
      body,
      query,
    });
    this.checkResponse(response);
    return response.data;
  }

  async deleteInternal<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T> {
    const response = await this.request<T>({
      method: 'DELETE',
      path,
      query,
    });
    this.checkResponse(response);
    return response.data;
  }

  private checkResponse<T>(response: HttpResponse<T>): void {
    if (response.status >= 400) {
      const error = response.data as any;
      const message = error?.message || error?.error || `HTTP ${response.status}`;
      throw new HttpError(message, response.status, response.data);
    }
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
