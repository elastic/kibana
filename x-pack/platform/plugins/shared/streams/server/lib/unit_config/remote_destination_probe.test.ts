/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRemoteDestinationProbe } from './remote_destination_probe';
import type { RemoteProbeResult } from './types';

const API_KEY = 'SECRET-KEY-VALUE';
const ENDPOINT = 'https://abc.elastic.cloud/base/';

const HOST_COPY =
  'Remote Elasticsearch destinations must use an https:// Elastic Cloud endpoint on .elastic.cloud, .elastic-cloud.com or .cloud.es.io. Copy the endpoint from your Elastic Cloud console.';
const NO_KEY_COPY = 'Remote Elasticsearch destinations need an API key.';
const MALFORMED_KEY_COPY =
  'The API key contains characters that cannot be sent in an HTTP header. Paste the key again.';
const TOO_OLD_COPY =
  'abc.elastic.cloud does not support Prometheus remote write. The remote cluster must run Elasticsearch 9.5.0 or later.';
const UNAUTHORIZED_COPY =
  'abc.elastic.cloud rejected the API key (HTTP 401). Check that the key is valid and has not expired.';
const KEY_CANNOT_WRITE_COPY =
  'The API key is not allowed to write to abc.elastic.cloud (HTTP 403).';
const REFUSED_COPY =
  "abc.elastic.cloud refused the request (HTTP 403). Check the deployment's traffic filters and the API key's privileges.";
const genericCopy = (status: number) =>
  `abc.elastic.cloud rejected the check request (HTTP ${status}).`;

const respond = (status: number, body = '') =>
  jest.fn().mockResolvedValue({ status, text: async () => body });

const untilAborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

const probe = async (
  fetchImpl: jest.Mock,
  options: { endpoint?: string; apiKey?: string; timeoutMs?: number } = {}
): Promise<RemoteProbeResult> => {
  const { endpoint = ENDPOINT, timeoutMs = 1_000 } = options;
  // A destructuring default would replace an explicit `apiKey: undefined`.
  const apiKey = 'apiKey' in options ? options.apiKey : API_KEY;
  const result = await createRemoteDestinationProbe({ fetchImpl, timeoutMs })({
    endpoint,
    apiKey,
  });
  expect(JSON.stringify(result)).not.toContain(API_KEY);
  return result;
};

describe('createRemoteDestinationProbe', () => {
  it('sends an empty protobuf POST with the key', async () => {
    const fetchImpl = respond(204);

    await probe(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://abc.elastic.cloud/base/_prometheus/api/v1/write',
      expect.objectContaining({
        method: 'POST',
        body: '',
        redirect: 'manual',
        headers: {
          Authorization: `ApiKey ${API_KEY}`,
          'Content-Type': 'application/x-protobuf',
        },
      })
    );
  });

  it.each([
    'https://abc.es.us-east-1.aws.elastic.cloud',
    'https://abc.es.us-east-1.aws.elastic.cloud:443/base/',
    'https://abc.us-east-1.aws.elastic-cloud.com',
    'https://my-alias.us-central1.gcp.cloud.es.io:9243',
  ])('checks the allowed host %s', async (endpoint) => {
    const fetchImpl = respond(204);

    expect(await probe(fetchImpl, { endpoint })).toEqual({ outcome: 'ok' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    'https://example.com',
    'http://abc.elastic.cloud',
    'https://user:pass@abc.elastic.cloud',
    'https://notelastic.cloud',
    'https://elastic.cloud.example.com',
    'https://elastic-cloud.com',
    'https://notelastic-cloud.com',
    'https://cloud.es.io.example.com',
    'https://abc.us-east-1.aws.found.io',
    'https://abc.elastic.cloud/base/?a=1',
    'https://abc.elastic.cloud/base/#f',
    'not a url',
  ])('rejects the host %s without sending a request', async (endpoint) => {
    const fetchImpl = respond(204);

    expect(await probe(fetchImpl, { endpoint })).toEqual({
      outcome: 'rejected',
      message: HOST_COPY,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a missing key without sending a request', async () => {
    const fetchImpl = respond(204);

    expect(await probe(fetchImpl, { apiKey: undefined })).toEqual({
      outcome: 'rejected',
      message: NO_KEY_COPY,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(['abc\ndef', 'ключ', 'abc def', ' abc'])(
    'rejects the key %j that cannot be sent in a header without sending a request',
    async (apiKey) => {
      const fetchImpl = respond(204);

      expect(await probe(fetchImpl, { apiKey })).toEqual({
        outcome: 'rejected',
        message: MALFORMED_KEY_COPY,
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  );

  it.each<[number, string, RemoteProbeResult]>([
    [204, '', { outcome: 'ok' }],
    [
      400,
      '{"error":"no handler found for uri [/_prometheus/api/v1/write] and method [POST]"}',
      { outcome: 'rejected', status: 400, message: TOO_OLD_COPY },
    ],
    [
      400,
      '{"error":"bad request"}',
      { outcome: 'rejected', status: 400, message: genericCopy(400) },
    ],
    [401, '', { outcome: 'rejected', status: 401, message: UNAUTHORIZED_COPY }],
    [
      403,
      'action [indices:data/write/prometheus/remote_write] is unauthorized for API key id [x]',
      { outcome: 'rejected', status: 403, message: KEY_CANNOT_WRITE_COPY },
    ],
    [403, '<html>Forbidden</html>', { outcome: 'rejected', status: 403, message: REFUSED_COPY }],
    [404, '', { outcome: 'rejected', status: 404, message: genericCopy(404) }],
    [408, '', { outcome: 'unverified', reason: 'unexpected_status', status: 408 }],
    [429, '', { outcome: 'unverified', reason: 'unexpected_status', status: 429 }],
    [302, '', { outcome: 'unverified', reason: 'unexpected_status', status: 302 }],
    [503, 'upstream down', { outcome: 'unverified', reason: 'unexpected_status', status: 503 }],
  ])('classifies HTTP %i with body %j', async (status, body, expected) => {
    expect(await probe(respond(status, body))).toEqual(expected);
  });

  it('reads the body of a real fetch Response', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(new Response('no handler found for uri', { status: 400 }));

    expect(await probe(fetchImpl)).toEqual({
      outcome: 'rejected',
      status: 400,
      message: TOO_OLD_COPY,
    });
  });

  it('times out', async () => {
    const fetchImpl = jest.fn((_url: string, { signal }: { signal: AbortSignal }) =>
      untilAborted(signal)
    );

    expect(await probe(fetchImpl, { timeoutMs: 5 })).toEqual({
      outcome: 'unverified',
      reason: 'timeout',
    });
  });

  it('reports a network failure as unreachable', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    expect(await probe(fetchImpl)).toEqual({ outcome: 'unverified', reason: 'unreachable' });
  });

  it('rejects a 403 whose body cannot be read', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 403,
      text: () => Promise.reject(new Error('boom')),
    });

    expect(await probe(fetchImpl)).toEqual({
      outcome: 'rejected',
      status: 403,
      message: genericCopy(403),
    });
  });

  it('rejects a 400 whose body stalls until the timeout', async () => {
    const fetchImpl = jest.fn(async (_url: string, { signal }: { signal: AbortSignal }) => ({
      status: 400,
      text: () => untilAborted(signal),
    }));

    expect(await probe(fetchImpl, { timeoutMs: 5 })).toEqual({
      outcome: 'rejected',
      status: 400,
      message: genericCopy(400),
    });
  });

  it('aborts the request after classifying', async () => {
    let requestSignal: AbortSignal | undefined;
    const fetchImpl = jest.fn(async (_url: string, { signal }: { signal: AbortSignal }) => {
      requestSignal = signal;
      return { status: 503, text: async () => '' };
    });

    await probe(fetchImpl);

    expect(requestSignal?.aborted).toBe(true);
  });
});
