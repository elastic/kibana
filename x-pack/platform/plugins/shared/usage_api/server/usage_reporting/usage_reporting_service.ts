/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';
import type { RequestInit, Response } from 'node-fetch';
import fetch from 'node-fetch';
import type { Logger } from '@kbn/logging';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import type { UsageRecord } from './types';
import { METERING_RETRY_ATTEMPTS, METERING_RETRY_BASE_DELAY_MS } from './constants';

/**
 * Config shape accepted by UsageReportingService.
 *
 * When supplied by the Usage API plugin, `url` is already the full endpoint.
 * When falling back to the plugin's own config, the caller must append the
 * endpoint path before passing the config here.
 */
export interface UsageReportingConfig {
  enabled: boolean;
  url?: string;
  tls?: {
    certificate: string;
    key: string;
    ca: string;
  };
}

/**
 * HTTP client for sending UsageRecords to the Usage API.
 *
 * Based on the pattern from security_solution_serverless UsageReportingService.
 * Supports mTLS authentication required by the Usage API in cloud environments.
 */
export class UsageReportingService {
  private agent: https.Agent | undefined;
  private readonly config: UsageReportingConfig;
  private readonly kibanaVersion: string;
  private readonly logger: Logger;

  constructor({
    config,
    kibanaVersion,
    logger,
  }: {
    config: UsageReportingConfig;
    kibanaVersion: string;
    logger: Logger;
  }) {
    this.config = config;
    this.kibanaVersion = kibanaVersion;
    this.logger = logger;
  }

  /**
   * Sends a usage record with inline retry and exponential backoff.
   * Per billing team guidance: data loss is preferable to overbilling,
   * so we retry a few times then give up (logged at error level).
   */
  public async reportUsage(records: UsageRecord[]): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < METERING_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await this._sendUsage(records);

        if (response.ok) {
          this.logger.debug(
            `Successfully reported metering for records ${records
              .map((r) => r.id)
              .join(', ')} (attempt ${attempt + 1})`
          );
          return;
        }

        throw new Error(`Usage API responded with status ${response.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      this.logger.warn(
        `Metering report attempt ${attempt + 1}/${METERING_RETRY_ATTEMPTS} failed: ${
          lastError.message
        }`
      );

      if (attempt < METERING_RETRY_ATTEMPTS - 1) {
        await delay(METERING_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error('Metering report failed after all retry attempts');
  }

  private async _sendUsage(records: UsageRecord[]): Promise<Response> {
    const reqArgs: RequestInit = {
      method: 'post',
      body: JSON.stringify(records),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Kibana/${this.kibanaVersion} node-fetch`,
      },
    };

    if (this.usageApiUrl.startsWith('https')) {
      reqArgs.agent = this.httpsAgent;
    }

    return fetch(this.usageApiUrl, reqArgs);
  }

  private get usageApiUrl(): string {
    const { url } = this.config;
    if (!url) {
      throw new Error('Usage API URL not configured for workflows metering');
    }
    return url;
  }

  private get httpsAgent(): https.Agent {
    if (this.agent) {
      return this.agent;
    }

    const { tls } = this.config;
    if (!tls) {
      throw new Error('Usage API TLS configuration not provided for workflows metering');
    }

    const tlsConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: tls.certificate,
        key: tls.key,
        certificateAuthorities: tls.ca,
      })
    );

    this.agent = new https.Agent({
      rejectUnauthorized: tlsConfig.rejectUnauthorized,
      cert: tlsConfig.certificate,
      key: tlsConfig.key,
      ca: tlsConfig.certificateAuthorities,
      allowPartialTrustChain: true,
    });

    return this.agent;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
