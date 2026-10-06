/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult, TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { isExternalUiamCredential } from '@kbn/core-security-server';

import { resolveKibanaInboundRequest } from './resolve_kibana_inbound_request';

const unauthorized = (statusCode: number) =>
  new errors.ResponseError({
    body: {},
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  } as TransportResult);

const createClient = () => {
  const client = elasticsearchClientMock.createClusterClient();
  authenticate(client).mockResolvedValue({ username: 'elastic' } as never);
  return client;
};

const authenticate = (client: ReturnType<typeof createClient>) =>
  client.asScoped().asCurrentUser.security.authenticate;

const resolve = (
  authorization: string | undefined,
  client: ReturnType<typeof createClient>,
  getKibanaRequestAccess: () => Promise<boolean> = async () => true
) =>
  resolveKibanaInboundRequest({
    headers: authorization === undefined ? {} : { authorization },
    spaceId: 'default',
    elasticsearchClient: client,
    getKibanaRequestAccess,
  });

describe('resolveKibanaInboundRequest', () => {
  const apiKey = Buffer.from('es-id:es-secret').toString('base64');

  it('returns a request when Elasticsearch accepts a normal ApiKey', async () => {
    const client = createClient();
    const request = await resolve(`ApiKey ${apiKey}`, client);

    expect(request?.headers.authorization).toBe(`ApiKey ${apiKey}`);
    expect(request && isExternalUiamCredential(request)).toBe(false);
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
  });

  it('accepts a user-created UIAM ApiKey without the shared secret', async () => {
    const client = createClient();
    const request = await resolve('ApiKey essu_install_key', client);

    expect(request?.headers.authorization).toBe('ApiKey essu_install_key');
    expect(request && isExternalUiamCredential(request)).toBe(true);
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
  });

  it('unwraps a base64(id:essu_…) grant and authenticates the raw UIAM secret', async () => {
    const client = createClient();
    const envelope = Buffer.from('es-id:essu_granted_key').toString('base64');
    const request = await resolve(`ApiKey ${envelope}`, client);

    expect(request?.headers.authorization).toBe('ApiKey essu_granted_key');
    expect(request && isExternalUiamCredential(request)).toBe(true);
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
  });

  it('accepts a Kibana-granted UIAM ApiKey after the first attempt is rejected', async () => {
    const client = createClient();
    authenticate(client).mockRejectedValueOnce(unauthorized(401));
    const request = await resolve('ApiKey essu_granted_key', client);

    expect(request?.headers.authorization).toBe('ApiKey essu_granted_key');
    expect(request && isExternalUiamCredential(request)).toBe(false);
    expect(authenticate(client)).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when both UIAM attempts are rejected', async () => {
    const client = createClient();
    authenticate(client).mockRejectedValue(unauthorized(401));

    await expect(resolve('ApiKey essu_install_key', client)).resolves.toBeUndefined();
    expect(authenticate(client)).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when the ApiKey cannot access the space', async () => {
    const client = createClient();
    const getKibanaRequestAccess = jest.fn().mockResolvedValue(false);

    await expect(
      resolve(`ApiKey ${apiKey}`, client, getKibanaRequestAccess)
    ).resolves.toBeUndefined();
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
    expect(getKibanaRequestAccess).toHaveBeenCalledTimes(1);
  });

  it('does not retry a UIAM key Elasticsearch accepts when the space check fails', async () => {
    const client = createClient();

    await expect(
      resolve('ApiKey essu_install_key', client, async () => false)
    ).resolves.toBeUndefined();
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when Elasticsearch rejects a normal ApiKey', async () => {
    const client = createClient();
    authenticate(client).mockRejectedValue(unauthorized(401));

    await expect(resolve(`ApiKey ${apiKey}`, client)).resolves.toBeUndefined();
    expect(authenticate(client)).toHaveBeenCalledTimes(1);
  });

  it('rethrows when Elasticsearch fails for a reason other than 401', async () => {
    const client = createClient();
    const failure = unauthorized(503);
    authenticate(client).mockRejectedValue(failure);

    await expect(resolve('ApiKey essu_install_key', client)).rejects.toBe(failure);
    await expect(resolve(`ApiKey ${apiKey}`, client)).rejects.toBe(failure);
    expect(authenticate(client)).toHaveBeenCalledTimes(2);
  });

  it('does not call Elasticsearch for a credential that is not an ApiKey', async () => {
    const client = createClient();

    await expect(resolve('ApiKey install-key', client)).resolves.toBeUndefined();
    await expect(resolve('Bearer credential.secret', client)).resolves.toBeUndefined();
    await expect(resolve(undefined, client)).resolves.toBeUndefined();
    expect(authenticate(client)).not.toHaveBeenCalled();
  });
});
