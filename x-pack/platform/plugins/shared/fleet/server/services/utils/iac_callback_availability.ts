/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';
import tls from 'tls';

import { appContextService } from '../app_context';

/** Whether a launched CloudFormation stack could report back to this Kibana, and why not. */
export interface IacCallbackAvailability {
  available: boolean;
  /** The URL the stack is given: `server.publicBaseUrl` without a trailing slash. */
  kibanaUrl?: string;
  /** Why the callback cannot be used, worded for the operator and the user. Set when unavailable. */
  reason?: string;
}

/** How long a probe result is reused before the public URL is checked again. */
export const IAC_CALLBACK_AVAILABILITY_TTL_MS = 60_000;
export const IAC_CALLBACK_PROBE_TIMEOUT_MS = 5_000;

export interface ProbeIacCallbackUrlOptions {
  /** Trust anchors for the probe. Defaults to the Mozilla roots bundled with Node, as a Lambda has. */
  ca?: string | string[];
  timeoutMs?: number;
}

/** Node's error codes for a certificate the configured trust anchors do not vouch for. */
const TLS_TRUST_ERROR_CODE = /^(CERT_|ERR_TLS_|DEPTH_ZERO_SELF_SIGNED|SELF_SIGNED|UNABLE_TO_)/;

const describeProbeError = (kibanaUrl: string, error: NodeJS.ErrnoException): string => {
  // A connection refused on every resolved address is an AggregateError with an empty message.
  const detail = error.message || error.code || 'unknown error';
  if (error.code && TLS_TRUST_ERROR_CODE.test(error.code)) {
    return `The public Kibana URL ${kibanaUrl} presents a TLS certificate that is not publicly trusted (${detail}). The CloudFormation stack only trusts public certificate authorities, as a browser does.`;
  }
  return `The public Kibana URL ${kibanaUrl} could not be reached (${detail}).`;
};

/**
 * Requests the status endpoint of `kibanaUrl` the way the stack's Lambda would: over TLS, trusting
 * only public certificate authorities. Any HTTP status proves the URL is reachable, so only a
 * connection or certificate failure counts. Resolves with the reason, or undefined when reachable.
 */
export const probeIacCallbackUrl = (
  kibanaUrl: string,
  {
    ca = [...tls.rootCertificates],
    timeoutMs = IAC_CALLBACK_PROBE_TIMEOUT_MS,
  }: ProbeIacCallbackUrlOptions = {}
): Promise<string | undefined> =>
  new Promise((resolve) => {
    const agent = new https.Agent({ ca });
    const request = https.request(
      `${kibanaUrl}/api/status`,
      { method: 'GET', agent, timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve(undefined);
      }
    );
    request.on('timeout', () => request.destroy(new Error(`no response within ${timeoutMs}ms`)));
    request.on('error', (error: NodeJS.ErrnoException) =>
      resolve(describeProbeError(kibanaUrl, error))
    );
    request.on('close', () => agent.destroy());
    request.end();
  });

let cached: { kibanaUrl: string; result: IacCallbackAvailability; expiresAt: number } | undefined;

export const clearIacCallbackAvailabilityCache = (): void => {
  cached = undefined;
};

/**
 * Checks that the stack's Lambda would be able to call this Kibana back: `server.publicBaseUrl`
 * must be set, be https, and answer with a publicly trusted certificate. A failed check is logged
 * at warn, since nothing else in Kibana can record a report that never arrives. The result is
 * cached for a minute per URL.
 */
export const getIacCallbackAvailability = async (
  probeOptions?: ProbeIacCallbackUrlOptions
): Promise<IacCallbackAvailability> => {
  const logger = appContextService.getLogger().get('iacCallback');
  const configured = appContextService.getHttpSetup().basePath.publicBaseUrl;
  if (!configured) {
    return {
      available: false,
      reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
    };
  }
  const kibanaUrl = configured.replace(/\/+$/, '');
  if (!/^https:\/\//.test(kibanaUrl)) {
    return {
      available: false,
      kibanaUrl,
      reason: `The public Kibana URL ${kibanaUrl} is not https. CloudFormation only accepts an https callback URL.`,
    };
  }

  const now = Date.now();
  if (cached && cached.kibanaUrl === kibanaUrl && cached.expiresAt > now) {
    return cached.result;
  }

  const reason = await probeIacCallbackUrl(kibanaUrl, probeOptions);
  const result: IacCallbackAvailability = reason
    ? { available: false, kibanaUrl, reason }
    : { available: true, kibanaUrl };
  if (reason) {
    logger.warn(
      `IaC callback unavailable: ${reason} A launched CloudFormation stack would not be able to report back.`
    );
  } else {
    logger.debug(
      `IaC callback available: ${kibanaUrl} answered with a publicly trusted certificate`
    );
  }
  cached = { kibanaUrl, result, expiresAt: now + IAC_CALLBACK_AVAILABILITY_TTL_MS };
  return result;
};
