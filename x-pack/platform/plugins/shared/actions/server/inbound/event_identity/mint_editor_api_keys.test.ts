/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { encodeApiKey } from './encode_api_key';
import { mintConnectorEventIdentity } from './mint_editor_api_keys';
import {
  CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
  connectorEventIdentityApiKeyName,
} from './types';

const connectorId = 'connector-1';
const name = connectorEventIdentityApiKeyName(connectorId);

const createSecurityService = ({ withUiam = false }: { withUiam?: boolean } = {}) => {
  const securityService = securityServiceMock.createStart();
  if (!withUiam) {
    // Stateful: UIAM grant is not available.
    (securityService.authc.apiKeys as { uiam?: unknown }).uiam = undefined;
  }
  return securityService;
};

describe('mintConnectorEventIdentity', () => {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('grants an ES API key from the save request', async () => {
    const securityService = createSecurityService();
    securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-id',
      name,
      api_key: 'es-secret',
    });

    const identity = await mintConnectorEventIdentity({
      request,
      securityService,
      logger,
      connectorId,
    });

    expect(securityService.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(request, {
      name,
      role_descriptors: {},
      metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
    });
    expect(identity).toEqual({
      apiKey: encodeApiKey('es-id', 'es-secret'),
    });
  });

  test('grants ES + UIAM when UIAM is available and the request has UIAM credentials', async () => {
    const securityService = createSecurityService({ withUiam: true });
    // Session auth (not api_key) so we grant rather than clone; header still carries UIAM material.
    securityService.authc.getCurrentUser.mockReturnValue({
      authentication_type: 'token',
    } as never);
    const uiamRequest = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey essu_session' },
    });
    securityService.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-id',
      name: `uiam-${name}`,
      api_key: 'essu_granted',
    });
    securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-id',
      name,
      api_key: 'es-secret',
    });

    const identity = await mintConnectorEventIdentity({
      request: uiamRequest,
      securityService,
      logger,
      connectorId,
    });

    expect(securityService.authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(uiamRequest, {
      name: `uiam-${name}`,
    });
    expect(identity).toEqual({
      apiKey: encodeApiKey('es-id', 'es-secret'),
      uiamApiKey: encodeApiKey('uiam-id', 'essu_granted'),
      uiamApiKeyExternal: false,
    });
  });

  test('invalidates the UIAM key when the ES grant fails', async () => {
    const securityService = createSecurityService({ withUiam: true });
    securityService.authc.getCurrentUser.mockReturnValue({
      authentication_type: 'token',
    } as never);
    const uiamRequest = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey essu_session' },
    });
    securityService.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-id',
      name: `uiam-${name}`,
      api_key: 'essu_granted',
    });
    securityService.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));

    await expect(
      mintConnectorEventIdentity({
        request: uiamRequest,
        securityService,
        logger,
        connectorId,
      })
    ).rejects.toThrow('es down');

    expect(securityService.authc.apiKeys.uiam!.invalidate).toHaveBeenCalledWith(uiamRequest, {
      id: 'uiam-id',
    });
  });

  test('throws when API keys are disabled', async () => {
    const securityService = createSecurityService();
    securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(null);

    await expect(
      mintConnectorEventIdentity({
        request,
        securityService,
        logger,
        connectorId,
      })
    ).rejects.toThrow('Unable to store connector event identity because API keys are disabled.');
  });

  test('clones the request API key when the saver authenticated with an API key', async () => {
    const securityService = createSecurityService();
    securityService.authc.getCurrentUser.mockReturnValue({
      authentication_type: 'api_key',
    } as never);
    securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue({
      id: 'clone-id',
      name,
      api_key: 'clone-secret',
      encoded: 'unused',
    });

    const identity = await mintConnectorEventIdentity({
      request,
      securityService,
      logger,
      connectorId,
    });

    expect(securityService.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalledWith(request, {
      name,
      metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
    });
    expect(securityService.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    expect(identity).toEqual({
      apiKey: encodeApiKey('clone-id', 'clone-secret'),
    });
  });

  test('rejects a Cloud API key outside serverless', async () => {
    const securityService = createSecurityService({ withUiam: false });
    securityService.authc.getCurrentUser.mockReturnValue({
      authentication_type: 'api_key',
    } as never);
    const cloudRequest = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey essu_cloud' },
    });

    await expect(
      mintConnectorEventIdentity({
        request: cloudRequest,
        securityService,
        logger,
        connectorId,
      })
    ).rejects.toThrow('Cloud API keys are only supported in serverless environments');
    expect(securityService.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
  });
});
