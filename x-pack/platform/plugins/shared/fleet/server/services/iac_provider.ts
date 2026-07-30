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

import {
  IacProviderConfigError,
  IacProviderRenderError,
  IacProviderUnavailableError,
} from '../errors';

import { appContextService } from './app_context';
import type { IacProviderConfig } from './utils/iac_provider';
import { isIacProviderEnabled } from './utils/iac_provider';

const RENDER_ENDPOINT = '/api/v1/render';
const RENDER_TIMEOUT_MS = 30_000;

export interface IacProviderRenderIntegration {
  name: string;
  version: string;
  enabledInputs: string[];
}

export interface IacProviderRenderRequest {
  provider: 'aws';
  integrations: IacProviderRenderIntegration[];
}

export interface IacProviderRenderResponse {
  artifactUrl: string;
  expiresAt: string;
}

interface IacProviderErrorBody {
  code?: string;
  message?: string;
  errors?: Array<{ code?: string; message?: string }>;
}

export interface IacProviderService {
  renderTemplate(request: IacProviderRenderRequest): Promise<IacProviderRenderResponse>;
}

/**
 * Extracts the provider's error codes/messages, tolerating both the single
 * `{ code, message }` shape the current handler returns and the
 * `{ errors: [...] }` MultiErrorResponse shape from the shared spec.
 */
export const parseIacProviderErrors = (body: unknown): Array<{ code: string; message: string }> => {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const { code, message, errors } = body as IacProviderErrorBody;
  if (Array.isArray(errors)) {
    return errors.map((e) => ({ code: e.code ?? 'unknown', message: e.message ?? '' }));
  }
  if (code || message) {
    return [{ code: code ?? 'unknown', message: message ?? '' }];
  }
  return [];
};

class IacProviderServiceImpl implements IacProviderService {
  public async renderTemplate(
    request: IacProviderRenderRequest
  ): Promise<IacProviderRenderResponse> {
    const logger = appContextService.getLogger().get('IacProviderService');
    const traceId = apm.currentTransaction?.traceparent;
    const iacProviderConfig = appContextService.getConfig()?.iacProvider;

    if (!isIacProviderEnabled()) {
      throw new IacProviderConfigError('IaC Provider is not enabled');
    }
    if (!iacProviderConfig?.api?.url) {
      throw new IacProviderConfigError(
        'missing IaC Provider API configuration in kibana.yml (xpack.fleet.iacProvider.api.url)'
      );
    }

    // The response's artifactUrl embeds signing credentials and must never be
    // logged; the request body contains only safe-to-log fields.
    logger.info(
      `[IaC Provider] Rendering template for provider ${
        request.provider
      }, integrations: ${JSON.stringify(request.integrations)}`
    );

    let dispatcher;
    try {
      dispatcher = this.createDispatcher(iacProviderConfig);
    } catch (error) {
      throw new IacProviderConfigError(`invalid TLS configuration: ${error.message}`);
    }

    const startTime = Date.now();
    const abortController = new AbortController();
    // The timeout must cover reading the body too, not just the response
    // headers — a provider that stalls mid-body would otherwise hang the
    // request handler indefinitely.
    const timeout = setTimeout(() => abortController.abort(), RENDER_TIMEOUT_MS);
    try {
      const response = await undiciFetch(`${iacProviderConfig.api.url}${RENDER_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          ...(traceId ? { 'X-Request-ID': traceId } : {}),
          'x-elastic-internal-origin': 'Kibana',
        },
        body: JSON.stringify(request),
        signal: abortController.signal,
        dispatcher,
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        throw await this.responseToError(response, logger, latencyMs, traceId);
      }

      const rendered = (await response.json()) as IacProviderRenderResponse;
      logger.info(
        `[IaC Provider] Render succeeded for provider ${request.provider} in ${latencyMs}ms`
      );
      return rendered;
    } catch (error) {
      if (error instanceof IacProviderRenderError || error instanceof IacProviderUnavailableError) {
        throw error;
      }
      // No usable response arrived — timeout, network failure, or a body that
      // stalled or wasn't JSON. Logged distinctly from HTTP errors:
      // availability signal, not contract.
      const latencyMs = Date.now() - startTime;
      logger.error(
        `[IaC Provider] No response from provider after ${latencyMs}ms (${error.message}) [Request Id: ${traceId}]`
      );
      throw new IacProviderUnavailableError(`no response from provider (${error.message})`);
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
    const providerErrors = parseIacProviderErrors(await response.json().catch(() => undefined));
    const codes = providerErrors.map(({ code }) => code);
    const details = providerErrors.map(({ code, message }) => `${code}: ${message}`).join('; ');
    logger.error(
      `[IaC Provider] Render failed with status ${status} after ${latencyMs}ms, errors: [${details}] [Request Id: ${traceId}]`
    );
    if (status >= 500) {
      return new IacProviderUnavailableError(`render request failed with status ${status}`, status);
    }
    return new IacProviderRenderError(
      `render request rejected with status ${status}${details ? `, ${details}` : ''}`,
      status,
      codes
    );
  }

  private createDispatcher(iacProviderConfig: IacProviderConfig | undefined) {
    const tls = iacProviderConfig?.api?.tls;
    // A half-configured pair must fail loudly: with only one of the two set,
    // `enabled` below would be false, sslSchema's certificate+key requirement
    // would never fire, and the client would silently connect without a
    // client certificate — unauthenticated against a provider that doesn't
    // verify clients.
    if (Boolean(tls?.certificate) !== Boolean(tls?.key)) {
      throw new Error(
        'both xpack.fleet.iacProvider.api.tls.certificate and .key must be set for mTLS client authentication'
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

export const iacProviderService: IacProviderService = new IacProviderServiceImpl();
