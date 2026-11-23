/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('net');
jest.mock('tls');

import { Socket } from 'net';
import { TLSSocket } from 'tls';

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import type { AuthenticationProviderOptions } from './base';
import { mockAuthenticationProviderOptions } from './base.mock';
import { BasicAuthenticationProvider } from './basic';
import { KerberosAuthenticationProvider } from './kerberos';
import { OIDCAuthenticationProvider } from './oidc';
import { PKIAuthenticationProvider } from './pki';
import { SAMLAuthenticationProvider } from './saml';
import { TokenAuthenticationProvider } from './token';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { sessionMock } from '../../session_management/session.mock';

const providers = [
  {
    name: 'basic',
    create: (options: AuthenticationProviderOptions) => new BasicAuthenticationProvider(options),
  },
  {
    name: 'token',
    create: (options: AuthenticationProviderOptions) => new TokenAuthenticationProvider(options),
  },
  {
    name: 'saml',
    create: (options: AuthenticationProviderOptions) =>
      new SAMLAuthenticationProvider(options, { realm: 'realm' }),
  },
  {
    name: 'oidc',
    create: (options: AuthenticationProviderOptions) =>
      new OIDCAuthenticationProvider(options, { realm: 'realm' }),
  },
  {
    name: 'kerberos',
    create: (options: AuthenticationProviderOptions) => new KerberosAuthenticationProvider(options),
  },
  {
    name: 'pki',
    create: (options: AuthenticationProviderOptions) => new PKIAuthenticationProvider(options),
  },
];

describe.each(providers)('$name session reauthentication', ({ name, create }) => {
  it('ignores forwarded authorization only for explicit reauthentication and validates minimal sessions with ES', async () => {
    const options = mockAuthenticationProviderOptions({ name });
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.security.authenticate.mockResponse(mockAuthenticatedUser());
    options.client.asScoped.mockReturnValue(client);
    const provider = create(options);
    const socket = new TLSSocket(new Socket());
    socket.authorized = true;
    socket.getPeerCertificate = jest.fn().mockReturnValue({ fingerprint256: 'fingerprint' });
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'Bearer forwarded-expired-token', cookie: 'sid=session' },
      socket,
      kibanaRouteOptions: {
        xsrfRequired: true,
        access: 'internal',
        security: {
          authc: { enabled: 'minimal', reason: 'test' },
          authz: { enabled: false, reason: 'test' },
        },
      },
    });
    const headers = request.headers;
    const session = sessionMock.createValue({
      provider: { type: name, name },
      state: {
        authorization: 'Basic session-credential',
        accessToken: 'session-token',
        refreshToken: 'refresh-token',
        realm: 'realm',
        peerCertificateFingerprint256: 'fingerprint',
      },
    });

    expect((await provider.authenticate(request, session)).notHandled()).toBe(true);
    expect(
      (await provider.authenticate(request, session, { reauthenticate: false })).notHandled()
    ).toBe(true);
    expect(options.client.asScoped).not.toHaveBeenCalled();

    const result = await provider.authenticate(request, session, { reauthenticate: true });

    expect(result.succeeded()).toBe(true);
    expect(client.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
    expect(options.client.asScoped).toHaveBeenCalledWith({
      headers: { ...headers, ...result.authHeaders },
    });
    expect(result.authHeaders?.authorization).not.toBe(headers.authorization);
    expect(request.headers).toBe(headers);
    expect(request.headers.authorization).toBe('Bearer forwarded-expired-token');
    expect(request.headers['kbn-auth-full']).toBeUndefined();
  });
});
