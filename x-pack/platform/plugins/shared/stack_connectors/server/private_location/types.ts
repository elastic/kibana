/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export interface PrivateLocationHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly maxRedirects?: number;
  /** Lowers the agent's response body cap; it cannot raise it. */
  readonly maxResponseBytes?: number;
  readonly timeoutSeconds?: number;
}

export interface PrivateLocationHttpResponse {
  readonly statusCode: number;
  /** Header names are lowercase, as in Node.js responses. */
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly bodyTruncated: boolean;
}

export interface PrivateLocationExecuteParams {
  /** Fleet agent policy id that identifies the private location. */
  readonly privateLocation: string;
  readonly connectorId: string;
  readonly request: PrivateLocationHttpRequest;
  /** Request the connector runs on behalf of; used to resolve the space. */
  readonly kibanaRequest?: KibanaRequest;
  readonly signal?: AbortSignal;
}

/**
 * Sends HTTP requests from an agent running inside a customer's private network.
 * `execute` rejects when the request could not be delivered or the agent could not reach the
 * target; responses from the target, including error status codes, resolve normally.
 */
export interface PrivateLocationRunner {
  execute(params: PrivateLocationExecuteParams): Promise<PrivateLocationHttpResponse>;
}

export type GetPrivateLocationRunner = () => PrivateLocationRunner | undefined;
