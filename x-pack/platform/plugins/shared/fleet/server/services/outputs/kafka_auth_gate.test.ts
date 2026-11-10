/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { checkKafkaKerberosAllowed, checkKafkaOAuth2Allowed } from './helpers';
import { checkKafkaAuthMethodAllowed } from './kafka_auth_gate';

jest.mock('./helpers');

describe('checkKafkaAuthMethodAllowed', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.mocked(checkKafkaOAuth2Allowed).mockResolvedValue({ result: true });
    jest
      .mocked(checkKafkaKerberosAllowed)
      .mockResolvedValue({ result: false, error: 'Kerberos is not allowed' });
  });

  it('checks OAuth2 with the OAuth2 requirements', async () => {
    expect(await checkKafkaAuthMethodAllowed('oauth2', esClientMock, soClientMock, {})).toEqual({
      result: true,
    });
    expect(checkKafkaOAuth2Allowed).toHaveBeenCalledWith(esClientMock, soClientMock);
  });

  it('checks Kerberos with the Kerberos requirements', async () => {
    const output = { kerberos: { auth_type: 'password' } };

    expect(
      await checkKafkaAuthMethodAllowed('kerberos', esClientMock, soClientMock, output)
    ).toEqual({ result: false, error: 'Kerberos is not allowed' });
    // the result can depend on the output, e.g. on the authentication of Kerberos
    expect(checkKafkaKerberosAllowed).toHaveBeenCalledWith(esClientMock, soClientMock, output);
  });
});
