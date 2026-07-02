/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  RelayClient,
  StartInstallRequestBody,
  StartInstallResponseBody,
  StartSlackInstallInput,
  StartSlackInstallResult,
} from './types';
import { RelayResponseError, RelayUnreachableError } from './errors';

export interface RelayClientOptions {
  /** Base URL of the relay-service, e.g. `https://relay.elastic.co`. */
  baseUrl: string;
  /**
   * Extra headers sent with every request, e.g. the `x-forwarded-client-cert`
   * header a local dev proxy would otherwise inject. Configured via
   * `xpack.streams.relayService.headers`. May override the default
   * `content-type` header.
   */
  headers?: Record<string, string>;
  // TODO tls options
  logger: Logger;
}

/**
 * Thin HTTP client for the Elastic relay-service. In production the relay
 * derives the deployment identity from the mTLS proxy's XFCC header, injected
 * by the cloud egress proxy downstream — this client sends no auth header
 * itself. For local development, the XFCC header (or any other header) can be
 * supplied via the `headers` option / `xpack.streams.relayService.headers`.
 */
export class RelayClientImpl implements RelayClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly logger: Logger;

  constructor({ baseUrl, headers, logger }: RelayClientOptions) {
    // Trim a trailing slash so `${this.baseUrl}/v1/...` never doubles up.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.headers = headers ?? {};
    this.logger = logger;
  }

  private async handleError(url: string, cause: Error | Response): Promise<never> {
    if ('status' in cause) {
      const text = await cause.text().catch(() => '');
      this.logger.error(
        `relay-service responded ${cause.status} to ${url}${text ? `: ${text}` : ''}`
      );
      throw new RelayResponseError(
        `Relay service returned an error (status ${cause.status})`,
        cause.status
      );
    }

    const message = cause.message;
    this.logger.error(`relay-service request to ${url} failed: ${message}`);
    throw new RelayUnreachableError(`Failed to reach the relay service: ${message}`, { cause });
  }

  async startSlackInstall(input: StartSlackInstallInput): Promise<StartSlackInstallResult> {
    const url = `${this.baseUrl}/v1/slack/install`;
    const body: StartInstallRequestBody = {
      deployment_token: input.deploymentToken,
      created_by_user_key: input.createdByUserKey,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return this.handleError(url, error instanceof Error ? error : new Error(String(error)));
    }

    if (!response.ok) {
      return this.handleError(url, response);
    }

    const responseBody = (await response.json()) as StartInstallResponseBody;
    return { authorizeUrl: responseBody.authorize_url };
  }
}
