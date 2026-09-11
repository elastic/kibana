/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { getUiamClientAuthentication } from './get_client_authentication';

describe('getUiamClientAuthentication', () => {
  it.each(['Bearer', 'bearer'])('forwards supplied client authentication for %s tokens', (scheme) => {
    for (const sharedSecret of ['upstream-secret', '']) {
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: `${scheme} essu_token`,
          'x-client-authentication': sharedSecret,
        },
      });
      expect(getUiamClientAuthentication(request)).toEqual({ sharedSecret });
    }
  });

  it.each(['Bearer', 'bearer'])(
    'defers to Kibana client authentication when %s tokens carry none',
    (scheme) => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: `${scheme} essu_token` },
      });
      expect(getUiamClientAuthentication(request)).toBeUndefined();
    }
  );

  it.each(['ApiKey', 'apikey', 'Basic'])(
    'retains the default client authentication behavior for %s',
    (scheme) => {
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: `${scheme} essu_credential`,
          'x-client-authentication': 'upstream-secret',
        },
      });
      expect(getUiamClientAuthentication(request)).toBeUndefined();
    }
  );

  it('uses Kibana client authentication for non-UIAM bearer tokens', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: 'Bearer some_non_uiam_token',
        'x-client-authentication': 'upstream-secret',
      },
    });
    expect(getUiamClientAuthentication(request)).toBeUndefined();
  });

  it('uses Kibana client authentication for internally created bearer tokens', () => {
    const request = httpServerMock.createFakeKibanaRequest({
      headers: { authorization: 'Bearer essu_token' },
    });
    expect(getUiamClientAuthentication(request)).toBeUndefined();
  });
});
