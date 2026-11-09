/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProbeRemoteDestination, RemoteProbeResult } from './types';

export const REMOTE_PROBE_TIMEOUT_MS = 10_000;

const ELASTIC_CLOUD_HOST_SUFFIX = '.elastic.cloud';
const PROMETHEUS_REMOTE_WRITE_PATH = '/_prometheus/api/v1/write';
const PROMETHEUS_REMOTE_WRITE_ACTION = 'indices:data/write/prometheus/remote_write';

const HOST_NOT_ALLOWED_MESSAGE =
  'Remote Elasticsearch destinations must use an https:// Elastic Cloud endpoint whose host ends with .elastic.cloud.';
const MISSING_API_KEY_MESSAGE = 'Remote Elasticsearch destinations need an API key.';
const MALFORMED_API_KEY_MESSAGE =
  'The API key contains characters that cannot be sent in an HTTP header. Paste the key again.';
// Stricter than undici's Latin-1 check, so the result does not depend on the fetch implementation.
const API_KEY_PATTERN = /^[\x21-\x7E]+$/;

type ProbeFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    redirect: 'manual';
    signal: AbortSignal;
  }
) => Promise<{ status: number; text: () => Promise<string> }>;

const parseAllowedEndpoint = (endpoint: string): URL | undefined => {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return undefined;
  }

  const allowed =
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.hostname.endsWith(ELASTIC_CLOUD_HOST_SUFFIX);
  return allowed ? url : undefined;
};

export const isAllowedRemoteEndpoint = (endpoint: string): boolean =>
  parseAllowedEndpoint(endpoint) !== undefined;

const getRejectionMessage = async (
  host: string,
  status: number,
  readBody: () => Promise<string>
): Promise<string> => {
  if (status === 401) {
    return `${host} rejected the API key (HTTP 401). Check that the key is valid and has not expired.`;
  }

  const genericMessage = `${host} rejected the check request (HTTP ${status}).`;
  if (status !== 400 && status !== 403) {
    return genericMessage;
  }

  let body: string;
  try {
    body = await readBody();
  } catch {
    return genericMessage;
  }

  if (status === 400) {
    return body.includes('no handler found')
      ? `${host} does not support Prometheus remote write. The remote cluster must run Elasticsearch 9.5.0 or later.`
      : genericMessage;
  }

  return body.includes(PROMETHEUS_REMOTE_WRITE_ACTION)
    ? `The API key is not allowed to write to ${host} (HTTP 403).`
    : `${host} refused the request (HTTP 403). Check the deployment's traffic filters and the API key's privileges.`;
};

/** Sends an empty Prometheus remote write request, which indexes nothing, to check the remote and the key. */
export const createRemoteDestinationProbe = ({
  fetchImpl,
  timeoutMs = REMOTE_PROBE_TIMEOUT_MS,
}: { fetchImpl?: ProbeFetch; timeoutMs?: number } = {}): ProbeRemoteDestination => {
  const send: ProbeFetch = fetchImpl ?? ((url, init) => fetch(url, init));

  return async ({ endpoint, apiKey }): Promise<RemoteProbeResult> => {
    const url = parseAllowedEndpoint(endpoint);
    if (!url) {
      return { outcome: 'rejected', message: HOST_NOT_ALLOWED_MESSAGE };
    }
    if (!apiKey) {
      return { outcome: 'rejected', message: MISSING_API_KEY_MESSAGE };
    }
    if (!API_KEY_PATTERN.test(apiKey)) {
      return { outcome: 'rejected', message: MALFORMED_API_KEY_MESSAGE };
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const request = async () => {
      try {
        return await send(
          `${url.origin}${url.pathname.replace(/\/+$/, '')}${PROMETHEUS_REMOTE_WRITE_PATH}`,
          {
            method: 'POST',
            headers: {
              Authorization: `ApiKey ${apiKey}`,
              'Content-Type': 'application/x-protobuf',
            },
            body: '',
            // A redirect could carry the key to another host.
            redirect: 'manual',
            signal: controller.signal,
          }
        );
      } catch {
        return undefined;
      }
    };

    try {
      const response = await request();
      if (!response) {
        return { outcome: 'unverified', reason: timedOut ? 'timeout' : 'unreachable' };
      }

      const { status } = response;
      if (status >= 200 && status < 300) {
        return { outcome: 'ok' };
      }
      if (status >= 400 && status < 500) {
        return {
          outcome: 'rejected',
          status,
          message: await getRejectionMessage(url.hostname, status, () => response.text()),
        };
      }
      return { outcome: 'unverified', reason: 'unexpected_status', status };
    } finally {
      clearTimeout(timer);
      // Releases unread bodies so the connection is not kept.
      controller.abort();
    }
  };
};
