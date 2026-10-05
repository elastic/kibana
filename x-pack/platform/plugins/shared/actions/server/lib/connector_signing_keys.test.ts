/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { RawConnectorSigningKey } from './connector_signing_keys';
import {
  NO_SIGNING_KEY_MESSAGE,
  createConnectorJwtSigner,
  createConnectorSigningKey,
  deleteConnectorSigningKey,
  getConnectorPublicKey,
  getSigningKeyPublicBaseUrl,
} from './connector_signing_keys';

const TYPE = 'connector_signing_key';
const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, 'connector-1');

const createKey = async (spaceId = 'default'): Promise<RawConnectorSigningKey> => {
  const client = savedObjectsClientMock.create();
  await createConnectorSigningKey({
    unsecuredSavedObjectsClient: client,
    publicBaseUrl: 'https://kibana.example.com',
    spaceId,
    connectorTypeId: '.ssf',
    connectorId: 'connector-1',
  });
  return client.create.mock.calls[0][1] as RawConnectorSigningKey;
};

const signerFor = (attributes: RawConnectorSigningKey | Error) => {
  const esoClient = encryptedSavedObjectsMock.createClient();
  if (attributes instanceof Error) {
    esoClient.getDecryptedAsInternalUser.mockRejectedValue(attributes);
  } else {
    esoClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'connector-1',
      type: TYPE,
      references: [],
      attributes,
    });
  }
  return createConnectorJwtSigner({
    getEncryptedSavedObjectsClient: async () => esoClient,
    connectorId: 'connector-1',
  });
};

describe('connector signing keys', () => {
  it('requires an HTTPS public base URL without a path', () => {
    expect(() => getSigningKeyPublicBaseUrl(undefined)).toThrow('server.publicBaseUrl');
    expect(() => getSigningKeyPublicBaseUrl('http://kibana.example.com')).toThrow('HTTPS');
    expect(() => getSigningKeyPublicBaseUrl('https://kibana.example.com/kibana')).toThrow(
      'without a path'
    );
    expect(getSigningKeyPublicBaseUrl('https://kibana.example.com')).toBe(
      'https://kibana.example.com'
    );
  });

  it('stores a server-owned key record with the connector ID', async () => {
    const client = savedObjectsClientMock.create();
    await createConnectorSigningKey({
      unsecuredSavedObjectsClient: client,
      publicBaseUrl: 'https://kibana.example.com',
      spaceId: 'security',
      connectorTypeId: '.ssf',
      connectorId: 'connector-1',
    });
    const [type, attributes, options] = client.create.mock.calls[0];
    expect(type).toBe(TYPE);
    expect(options).toEqual({
      id: 'connector-1',
      overwrite: true,
      references: [{ name: 'connector', type: 'action', id: 'connector-1' }],
    });
    expect(attributes).toMatchObject({
      connectorId: 'connector-1',
      issuer: 'https://kibana.example.com/s/security/api/actions/public/.ssf/connector-1',
      publicKey: { kty: 'RSA', alg: 'RS256', use: 'sig' },
      privateKey: expect.stringContaining('BEGIN PRIVATE KEY'),
    });
    expect((attributes as RawConnectorSigningKey).publicKey).not.toHaveProperty('d');
  });

  it('signs a SET that can be verified using only its published key', async () => {
    const key = await createKey();
    const token = await signerFor(key)({
      iss: 'https://attacker.example.com',
      aud: 'https://example.okta.com',
      jti: 'event-1',
    });
    const pem = createPublicKey({ key: key.publicKey, format: 'jwk' }).export({
      type: 'spki',
      format: 'pem',
    });
    const decoded = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: key.issuer,
      audience: 'https://example.okta.com',
      complete: true,
    });
    expect(decoded.header).toMatchObject({
      alg: 'RS256',
      typ: 'secevent+jwt',
      kid: key.publicKey.kid,
    });
    expect(decoded.payload).toMatchObject({ jti: 'event-1' });
    expect(decoded.payload).not.toHaveProperty('exp');

    const other = await createKey();
    const otherPem = createPublicKey({ key: other.publicKey, format: 'jwk' }).export({
      type: 'spki',
      format: 'pem',
    });
    expect(() => jwt.verify(token, otherPem, { algorithms: ['RS256'] })).toThrow(
      'invalid signature'
    );
  });

  it('fails with a clear error when the connector has no key record', async () => {
    await expect(signerFor(notFound())({})).rejects.toThrow(NO_SIGNING_KEY_MESSAGE);
  });

  it('does not sign with a key record that belongs to another connector', async () => {
    const key = await createKey();
    await expect(signerFor({ ...key, connectorId: 'connector-2' })({})).rejects.toThrow(
      NO_SIGNING_KEY_MESSAGE
    );
  });

  it('returns only public JWK members and checks key ownership', async () => {
    const key = await createKey();
    const client = savedObjectsClientMock.create();
    client.get.mockResolvedValueOnce({
      id: 'connector-1',
      type: TYPE,
      references: [],
      attributes: { ...key, publicKey: { ...key.publicKey, d: 'private' } },
    });
    expect(
      await getConnectorPublicKey({ savedObjectsClient: client, connectorId: 'connector-1' })
    ).toEqual({
      issuer: key.issuer,
      publicKey: key.publicKey,
    });

    client.get.mockResolvedValueOnce({
      id: 'connector-1',
      type: TYPE,
      references: [],
      attributes: { ...key, connectorId: 'connector-2' },
    });
    expect(
      await getConnectorPublicKey({ savedObjectsClient: client, connectorId: 'connector-1' })
    ).toBeUndefined();

    client.get.mockRejectedValueOnce(notFound());
    expect(
      await getConnectorPublicKey({ savedObjectsClient: client, connectorId: 'connector-1' })
    ).toBeUndefined();
  });

  it('ignores a missing key record on delete', async () => {
    const client = savedObjectsClientMock.create();
    client.delete.mockRejectedValueOnce(notFound());
    await expect(
      deleteConnectorSigningKey({ unsecuredSavedObjectsClient: client, connectorId: 'connector-1' })
    ).resolves.toBeUndefined();
    expect(client.delete).toHaveBeenCalledWith(TYPE, 'connector-1');
  });
});
