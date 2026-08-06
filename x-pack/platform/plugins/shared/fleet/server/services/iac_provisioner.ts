/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, fetch as undiciFetch } from 'undici';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import type { Logger } from '@kbn/logging';
import apm from 'elastic-apm-node';

import type { AWS_CLOUD_PROVIDER } from '../../common/types/models/cloud_connector';

import {
  IacProvisionerConfigError,
  IacProvisionerRenderError,
  IacProvisionerUnavailableError,
} from '../errors';

import { appContextService } from './app_context';
import type { IacProvisionerConfig } from './utils/iac_provisioner';
import { isIacProvisionerEnabled } from './utils/iac_provisioner';

const RENDER_ENDPOINT = '/api/v1/render';
const RENDER_TIMEOUT_MS = 30_000;

export interface IacProvisionerRenderIntegration {
  name: string;
  version: string;
  enabledInputs: string[];
}

export interface IacProvisionerRenderRequest {
  // Only AWS is supported today; typed off the shared constant so the value
  // and type can't drift and adding a provider is a one-line change.
  provider: typeof AWS_CLOUD_PROVIDER;
  integrations: IacProvisionerRenderIntegration[];
}

export interface IacProvisionerRenderResponse {
  artifactUrl: string;
  expiresAt: string;
}

interface IacProvisionerErrorBody {
  code?: string;
  message?: string;
  errors?: Array<{ code?: string; message?: string }>;
}

export interface IacProvisionerService {
  renderTemplate(request: IacProvisionerRenderRequest): Promise<IacProvisionerRenderResponse>;
}

/**
 * Extracts the provider's error codes/messages, tolerating both the single
 * `{ code, message }` shape the current handler returns and the
 * `{ errors: [...] }` MultiErrorResponse shape from the shared spec.
 */
export const parseIacProvisionerErrors = (
  body: unknown
): Array<{ code: string; message: string }> => {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const { code, message, errors } = body as IacProvisionerErrorBody;
  if (Array.isArray(errors)) {
    return errors.map((e) => ({ code: e.code ?? 'unknown', message: e.message ?? '' }));
  }
  if (code || message) {
    return [{ code: code ?? 'unknown', message: message ?? '' }];
  }
  return [];
};

class IacProvisionerServiceImpl implements IacProvisionerService {
  public async renderTemplate(
    request: IacProvisionerRenderRequest
  ): Promise<IacProvisionerRenderResponse> {
    const logger = appContextService.getLogger().get('IacProvisionerService');
    const traceId = apm.currentTransaction?.traceparent;
    const iacProvisionerConfig = appContextService.getConfig()?.iacProvisioner;

    if (!isIacProvisionerEnabled()) {
      throw new IacProvisionerConfigError('IaC Provisioner is not enabled');
    }
    if (!iacProvisionerConfig?.api?.url) {
      throw new IacProvisionerConfigError(
        'missing IaC Provisioner API configuration in kibana.yml (xpack.fleet.iacProvisioner.api.url)'
      );
    }

    // The response's artifactUrl embeds signing credentials and must never be
    // logged; the request body contains only safe-to-log fields.
    logger.info(
      `[IaC Provisioner] Rendering template for provider ${
        request.provider
      }, integrations: ${JSON.stringify(request.integrations)}`
    );

    let dispatcher;
    try {
      dispatcher = this.createDispatcher(iacProvisionerConfig);
    } catch (error) {
      throw new IacProvisionerConfigError(`invalid TLS configuration: ${error.message}`);
    }

    const url = `${iacProvisionerConfig.api.url}${RENDER_ENDPOINT}`;
    const headers = {
      'Content-type': 'application/json',
      ...(traceId ? { 'X-Request-ID': traceId } : {}),
      'x-elastic-internal-origin': 'Kibana',
    };
    logger.debug(
      `[IaC Provisioner] Render request config ${this.createRequestConfigDebug(
        url,
        headers,
        request,
        iacProvisionerConfig
      )}`
    );

    const startTime = Date.now();
    const abortController = new AbortController();
    // The timeout must cover reading the body too, not just the response
    // headers — a provider that stalls mid-body would otherwise hang the
    // request handler indefinitely.
    const timeout = setTimeout(() => abortController.abort(), RENDER_TIMEOUT_MS);
    try {
      const response = await undiciFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: abortController.signal,
        dispatcher,
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        throw await this.responseToError(response, logger, latencyMs, traceId);
      }

      const rendered = (await response.json()) as IacProvisionerRenderResponse;
      logger.info(
        `[IaC Provisioner] Render succeeded for provider ${request.provider} in ${latencyMs}ms`
      );
      // artifactUrl embeds signing credentials — only the expiry is loggable.
      logger.debug(
        `[IaC Provisioner] Render response: status ${response.status}, artifact expires at ${rendered.expiresAt} [Request Id: ${traceId}]`
      );
      return rendered;
    } catch (error) {
      if (
        error instanceof IacProvisionerRenderError ||
        error instanceof IacProvisionerUnavailableError
      ) {
        throw error;
      }
      // No usable response arrived — timeout, network failure, or a body that
      // stalled or wasn't JSON. Logged distinctly from HTTP errors:
      // availability signal, not contract.
      const latencyMs = Date.now() - startTime;
      logger.error(
        `[IaC Provisioner] No response from provider after ${latencyMs}ms (${error.message}) [Request Id: ${traceId}]`
      );
      throw new IacProvisionerUnavailableError(`no response from provider (${error.message})`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async responseToError(
    response: { status: number; json: () => Promise<unknown> },
    logger: Logger,
    latencyMs: number,
    traceId?: string
  ): Promise<Error> {
    const status = response.status;
    const providerErrors = parseIacProvisionerErrors(await response.json().catch(() => undefined));
    const codes = providerErrors.map(({ code }) => code);
    const details = providerErrors.map(({ code, message }) => `${code}: ${message}`).join('; ');
    logger.error(
      `[IaC Provisioner] Render failed with status ${status} after ${latencyMs}ms, errors: [${details}] [Request Id: ${traceId}]`
    );
    if (status >= 500) {
      return new IacProvisionerUnavailableError(
        `render request failed with status ${status}`,
        status
      );
    }
    return new IacProvisionerRenderError(
      `render request rejected with status ${status}${details ? `, ${details}` : ''}`,
      status,
      codes
    );
  }

  /**
   * Serializes the outbound request for debug logging, mirroring the
   * Agentless API service's createRequestConfigDebug. The request body is
   * safe to log in full; TLS material is reduced to a REDACTED presence
   * marker so the log shows which pieces are configured without leaking
   * paths or key material.
   */
  private createRequestConfigDebug(
    url: string,
    headers: Record<string, string>,
    request: IacProvisionerRenderRequest,
    iacProvisionerConfig: IacProvisionerConfig | undefined
  ) {
    const tls = iacProvisionerConfig?.api?.tls;
    return JSON.stringify({
      url,
      method: 'POST',
      headers,
      timeoutMs: RENDER_TIMEOUT_MS,
      body: request,
      tls: {
        certificate: tls?.certificate ? 'REDACTED' : undefined,
        key: tls?.key ? 'REDACTED' : undefined,
        ca: tls?.ca ? 'REDACTED' : undefined,
        rejectUnauthorized: true,
      },
    });
  }

  private createDispatcher(iacProvisionerConfig: IacProvisionerConfig | undefined) {
    const tls = iacProvisionerConfig?.api?.tls;
    // A half-configured pair must fail loudly: with only one of the two set,
    // `enabled` below would be false, sslSchema's certificate+key requirement
    // would never fire, and the client would silently connect without a
    // client certificate — unauthenticated against a provider that doesn't
    // verify clients.
    if (Boolean(tls?.certificate) !== Boolean(tls?.key)) {
      throw new Error(
        'both xpack.fleet.iacProvisioner.api.tls.certificate and .key must be set for mTLS client authentication'
      );
    }
    // `enabled` only gates sslSchema's certificate+key requirement — the
    // certificate authorities are read either way. This keeps CA-only setups
    // working (e.g. local dev against a provider that doesn't verify clients)
    // while production supplies the full mTLS client cert pair.
    const tlsConfig = new SslConfig(
      sslSchema.validate({
        enabled: Boolean(tls?.certificate && tls?.key),
        certificate: tls?.certificate,
        key: tls?.key,
        certificateAuthorities: tls?.ca,
      })
    );
    return new Agent({
      connect: {
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
        ca: tlsConfig.certificateAuthorities,
        // Always verify the server certificate. SslConfig.rejectUnauthorized
        // carries server-side client-auth semantics and defaults to false —
        // not applicable to an outbound client connection.
        rejectUnauthorized: true,
      },
    });
  }
}

export const iacProvisionerService: IacProvisionerService = new IacProvisionerServiceImpl();
