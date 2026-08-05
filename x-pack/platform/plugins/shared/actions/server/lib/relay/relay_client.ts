/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { request } from '../axios_utils';
import { RelayRequestError } from './relay_error';
import type {
  RelayCallbackResponse,
  RelayClaimResponse,
  RelayClientContract,
  RelayInstallRequest,
  RelayInstallResponse,
} from './types';

export interface RelayClientOptions {
  baseUrl: string;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

interface RelayErrorResponse {
  message?: string;
}

export class RelayClient implements RelayClientContract {
  private readonly axios = axios.create();
  private readonly baseUrl: URL;
  private readonly configurationUtilities: ActionsConfigurationUtilities;
  private readonly logger: Logger;

  constructor({ baseUrl, configurationUtilities, logger }: RelayClientOptions) {
    this.baseUrl = new URL(baseUrl);
    this.configurationUtilities = configurationUtilities;
    this.logger = logger;
  }

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const response = await this.post('/v1/slack/install', body);
    return response.data as RelayInstallResponse;
  }

  async fetchClaim(claimId: string): Promise<RelayClaimResponse> {
    const response = await this.post('/v1/slack/install/claim', { claim_id: claimId });

    if (response.status === 202) {
      return { status: 'pending' };
    }

    const claim = response.data as { tenant_key: string };
    return { status: 'complete', tenant_key: claim.tenant_key };
  }

  async unbind(): Promise<void> {
    await this.post('/v1/slack/uninstall', {});
  }

  isRelayOrigin(url: string): boolean {
    try {
      return new URL(url).origin === this.baseUrl.origin;
    } catch {
      return false;
    }
  }

  async postCallback(
    url: string,
    body: unknown,
    signal: AbortSignal
  ): Promise<RelayCallbackResponse> {
    if (!this.isRelayOrigin(url)) {
      throw new Error('Callback URL does not match the configured Relay origin');
    }

    const response = await this.sendRequest(url, body, signal);
    return { status: response.status };
  }

  private async post(path: string, body: unknown): Promise<AxiosResponse> {
    const response = await this.sendRequest(new URL(path, this.baseUrl).toString(), body);
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    const relayMessage = (response.data as RelayErrorResponse | undefined)?.message;
    throw new RelayRequestError(path, response.status, relayMessage);
  }

  private sendRequest(url: string, data: unknown, signal?: AbortSignal): Promise<AxiosResponse> {
    return request({
      axios: this.axios,
      url,
      method: 'post',
      data,
      headers: { 'Content-Type': 'application/json' },
      configurationUtilities: this.configurationUtilities,
      sslOverrides: this.configurationUtilities.getRelaySSLSettings(),
      logger: this.logger,
      signal,
      maxRedirects: 0,
      validateStatus: () => true,
    });
  }
}
