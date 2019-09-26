/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { telemetryJWKS } from './telemetry_jwks';
import { encryptTelemetry, getKID } from './encrypt';
import { createRequestEncryptor } from '@elastic/request-crypto';

jest.mock('@elastic/request-crypto', () => ({
  createRequestEncryptor: jest.fn().mockResolvedValue({
    encrypt: jest.fn(),
  }),
}));

describe('getKID', () => {
  it(`returns 'kibana_dev' kid for development`, async () => {
    const isProd = false;
    const kid = getKID(isProd);
    expect(kid).toBe('kibana_dev');
  });

  it(`returns 'kibana_prod' kid for development`, async () => {
    const isProd = true;
    const kid = getKID(isProd);
    expect(kid).toBe('kibana');
  });
});

describe('encryptTelemetry', () => {
  it('encrypts payload', async () => {
    const payload = { some: 'value' };
    await encryptTelemetry(payload, true);
    expect(createRequestEncryptor).toBeCalledWith(telemetryJWKS);
  });
});
