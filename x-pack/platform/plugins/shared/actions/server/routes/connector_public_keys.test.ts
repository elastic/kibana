/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { connectorPublicKeysRoutes } from './connector_public_keys';
import { createUnsecuredInboundSavedObjectsClient } from '../inbound/create_unsecured_inbound_saved_objects_client';
import { mockHandlerArguments } from './_mock_handler_arguments';

jest.mock('../inbound/create_unsecured_inbound_saved_objects_client');

const JWKS_PATH = '/api/actions/public/{connector_type_id}/{connector_id}/jwks.json';
const DISCOVERY_PATH =
  '/.well-known/ssf-configuration/api/actions/public/{connector_type_id}/{connector_id}';
const SPACE_DISCOVERY_PATH =
  '/.well-known/ssf-configuration/s/{space_id}/api/actions/public/{connector_type_id}/{connector_id}';

const publicKey = {
  kty: 'RSA',
  n: 'server-modulus',
  e: 'AQAB',
  kid: 'server-key',
  alg: 'RS256',
  use: 'sig',
};
const issuer = 'https://kibana.example.com/api/actions/public/.ssf/connector-1';

const savedObject = (type: string, attributes: Record<string, unknown>) => ({
  id: 'connector-1',
  type,
  references: [],
  attributes,
});

describe('connector public keys', () => {
  const client = savedObjectsClientMock.create();
  const router = httpServiceMock.createRouter();
  const core = coreMock.createSetup();
  const getSpaceId = jest.fn().mockReturnValue('default');
  const actionObject = savedObject('action', {
    actionTypeId: '.ssf',
    name: 'private connector name',
    config: {
      oktaUrl: 'https://private.okta.com',
      issuer: 'https://attacker.example.com',
      publicKey: { ...publicKey, n: 'imported-modulus', kid: 'imported-key' },
    },
    secrets: { signingPrivateKey: 'IMPORTED PRIVATE KEY' },
  });
  const keyObject = savedObject('connector_signing_key', {
    connectorId: 'connector-1',
    issuer,
    publicKey: { ...publicKey, d: 'private' },
    createdAt: '2026-10-04T00:00:00.000Z',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    router.get.mockReset();
    jest.mocked(createUnsecuredInboundSavedObjectsClient).mockResolvedValue(client);
    client.get.mockImplementation(async (type) => (type === 'action' ? actionObject : keyObject));
    connectorPublicKeysRoutes({ router, core, getSpaceId });
  });

  const invoke = async (path: string, connectorTypeId = '.ssf', spaceId?: string) => {
    const route = router.get.mock.calls.find(([config]) => config.path === path);
    if (!route) throw new Error(`Route ${path} is not registered.`);
    const [config, handler] = route;
    const request = httpServerMock.createKibanaRequest({
      params: {
        connector_type_id: connectorTypeId,
        connector_id: 'connector-1',
        ...(spaceId ? { space_id: spaceId } : {}),
      },
    });
    const [context, , response] = mockHandlerArguments({}, request, ['ok', 'notFound']);
    await handler(context, request, response);
    return { config, response };
  };

  it('returns the server key, not key fields from the connector config, without authentication', async () => {
    const { config, response } = await invoke(JWKS_PATH);
    expect(config.security).toMatchObject({ authc: { enabled: false }, authz: { enabled: false } });
    expect(createUnsecuredInboundSavedObjectsClient).toHaveBeenCalledWith(
      expect.objectContaining({ includedHiddenTypes: ['action', 'connector_signing_key'] })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { keys: [publicKey] },
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  });

  it('returns discovery metadata with the issuer from the key record', async () => {
    const { response } = await invoke(DISCOVERY_PATH);
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          spec_version: '1_0',
          issuer,
          jwks_uri: `${issuer}/jwks.json`,
          delivery_methods_supported: ['urn:ietf:rfc:8935'],
        },
      })
    );
  });

  it('does not load connectors that do not publish keys', async () => {
    const { response } = await invoke(JWKS_PATH, '.webhook');
    expect(response.notFound).toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
  });

  it('uses the requested space and returns 404 when the connector is absent there', async () => {
    client.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('action', 'connector-1')
    );
    const { response } = await invoke(SPACE_DISCOVERY_PATH, '.ssf', 'other-space');
    expect(createUnsecuredInboundSavedObjectsClient).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'other-space' })
    );
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 404 when the connector has another type', async () => {
    client.get.mockResolvedValueOnce(savedObject('action', { actionTypeId: '.other' }));
    const { response } = await invoke(JWKS_PATH);
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 404 when the connector has no key record', async () => {
    client.get.mockImplementation(async (type) => {
      if (type === 'action') return actionObject;
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, 'connector-1');
    });
    const { response } = await invoke(JWKS_PATH);
    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 404 when the key record belongs to another connector', async () => {
    client.get.mockImplementation(async (type) =>
      type === 'action'
        ? actionObject
        : savedObject('connector_signing_key', { ...keyObject.attributes, connectorId: 'other' })
    );
    const { response } = await invoke(JWKS_PATH);
    expect(response.notFound).toHaveBeenCalled();
  });
});
