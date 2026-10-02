/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request, Response, Headers } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import { AuthTypeRegistry, registerAuthTypes } from '../auth_types';
import { actionsConfigMock } from '../actions_config.mock';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { getAxiosInstanceWithAuth } from './get_axios_instance';

jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));

let nock: typeof import('nock');
const origin = 'https://threatq.example.com';
const tokenUrl = `${origin}/api/token`;
const secrets = {
  authType: 'oauth_password',
  tokenUrl,
  username: 'user@example.com',
  password: 'user-password',
  clientId: 'api-password',
  usernameField: 'email',
  requestBodyFormat: 'json',
  tokenType: 'Bearer',
};
const tokenBody = {
  email: secrets.username,
  password: secrets.password,
  client_id: secrets.clientId,
  grant_type: 'password',
};
const storedToken = {
  id: 'stored-token',
  connectorId: 'connector',
  tokenType: 'access_token' as const,
  token: 'Bearer first-token',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

describe('OAuth password authentication', () => {
  const logger = loggerMock.create();
  const configurationUtilities = actionsConfigMock.create();
  const connectorTokenClient = connectorTokenClientMock.create();
  const registry = new AuthTypeRegistry();
  registerAuthTypes(registry);
  const getClient = getAxiosInstanceWithAuth({
    authTypeRegistry: registry,
    configurationUtilities,
    logger,
  });
  const configure = () => getClient({ connectorId: 'connector', secrets, connectorTokenClient });
  const originalFetchClasses = {
    Request: globalThis.Request,
    Response: globalThis.Response,
    Headers: globalThis.Headers,
  };

  beforeAll(() => {
    Object.assign(globalThis, { Request, Response, Headers });
    nock = jest.requireActual('nock');
    nock.disableNetConnect();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    configurationUtilities.ensureUriAllowed.mockReset();
    connectorTokenClient.get
      .mockReset()
      .mockResolvedValue({ hasErrors: false, connectorToken: null });
  });
  afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
  });
  afterAll(() => {
    nock.enableNetConnect();
    Object.assign(globalThis, originalFetchClasses);
  });

  it('exchanges credentials, reuses the token, and obtains a new token after expiry', async () => {
    nock(origin, { reqheaders: { 'content-type': 'application/json' } })
      .post('/api/token', tokenBody)
      .reply(200, { access_token: 'first-token', token_type: 'bearer', expires_in: 3600 })
      .post('/api/token', tokenBody)
      .reply(200, { access_token: 'second-token', token_type: 'Bearer', expires_in: 3600 });
    nock(origin, { reqheaders: { authorization: 'Bearer first-token' } })
      .get('/api/indicator/types')
      .twice()
      .reply(200, { data: [] });
    nock(origin, { reqheaders: { authorization: 'Bearer second-token' } })
      .get('/api/indicator/types')
      .reply(200, { data: [] });

    await (await configure()).get(`${origin}/api/indicator/types`);
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ newToken: 'Bearer first-token', expiresInSec: 3600 })
    );

    connectorTokenClient.get.mockResolvedValue({ hasErrors: false, connectorToken: storedToken });
    await (await configure()).get(`${origin}/api/indicator/types`);
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledTimes(1);

    connectorTokenClient.get.mockResolvedValue({
      hasErrors: false,
      connectorToken: { ...storedToken, expiresAt: new Date(Date.now() - 1).toISOString() },
    });
    await (await configure()).get(`${origin}/api/indicator/types`);
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledTimes(2);
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(tokenUrl);
  });

  it('discards a rejected token so the next execution can authenticate again', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: storedToken,
    });
    nock(origin).get('/api/indicator/types').reply(401);
    await expect((await configure()).get(`${origin}/api/indicator/types`)).rejects.toThrow();
    expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'connector',
    });

    nock(origin)
      .post('/api/token', tokenBody)
      .reply(200, { access_token: 'replacement', token_type: 'Bearer', expires_in: 3600 });
    expect((await configure()).defaults.headers.common.Authorization).toBe('Bearer replacement');
  });

  it('enforces the host policy before sending user credentials', async () => {
    configurationUtilities.ensureUriAllowed.mockImplementation(() => {
      throw new Error('Host is not allowed');
    });
    await expect(configure()).rejects.toThrow('Host is not allowed');
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(tokenUrl);
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
  });

  it('does not forward credentials when the token endpoint redirects', async () => {
    nock(origin)
      .post('/api/token', tokenBody)
      .reply(307, '', { Location: 'https://other.example.com/token' });
    await expect(configure()).rejects.toThrow('OAuth password token request failed (HTTP 307).');
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
  });
});
