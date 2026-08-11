/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { AlertingAuthorizationClientFactoryOpts } from './alerting_authorization_client_factory';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

jest.mock('./authorization/alerting_authorization');

describe('AlertingAuthorizationClientFactory', () => {
  const features = featuresPluginMock.createStart();
  const securityPluginStart = securityMock.createStart();
  const logger = loggingSystemMock.create().get();
  const alertingAuthorizationClientFactoryParams: jest.Mocked<AlertingAuthorizationClientFactoryOpts> =
    {
      ruleTypeRegistry: ruleTypeRegistryMock.create(),
      getSpace: jest.fn(),
      getSpaceId: jest.fn(),
      features,
      logger,
    };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an alerting authorization client with proper constructor arguments when security is enabled', async () => {
    const factory = new AlertingAuthorizationClientFactory();

    factory.initialize({
      securityPluginStart,
      ...alertingAuthorizationClientFactoryParams,
    });

    const request = mockRouter.createKibanaRequest();

    await factory.create(request);

    const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
    expect(AlertingAuthorization.create).toHaveBeenCalledWith({
      request,
      authorization: securityPluginStart.authz,
      ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
      features: alertingAuthorizationClientFactoryParams.features,
      getSpace: expect.any(Function),
      getSpaceId: expect.any(Function),
    });
  });

  it('creates an alerting authorization client with proper constructor arguments', async () => {
    const factory = new AlertingAuthorizationClientFactory();
    factory.initialize(alertingAuthorizationClientFactoryParams);
    const request = mockRouter.createKibanaRequest();

    await factory.create(request);

    const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
    expect(AlertingAuthorization.create).toHaveBeenCalledWith({
      request,
      ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
      features: alertingAuthorizationClientFactoryParams.features,
      getSpace: expect.any(Function),
      getSpaceId: expect.any(Function),
    });
  });

  it('throws when trying to initialize again and it is already initialized', async () => {
    const factory = new AlertingAuthorizationClientFactory();
    factory.initialize(alertingAuthorizationClientFactoryParams);

    expect(() =>
      factory.initialize(alertingAuthorizationClientFactoryParams)
    ).toThrowErrorMatchingInlineSnapshot(
      `"AlertingAuthorizationClientFactory already initialized"`
    );
  });

  it('throws when trying to create an instance and the factory is not initialized', async () => {
    const request = mockRouter.createKibanaRequest();
    const factory = new AlertingAuthorizationClientFactory();

    await expect(() => factory.create(request)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"AlertingAuthorizationClientFactory must be initialized before calling create"`
    );
  });

  describe('createForSpace', () => {
    it('falls back to create() when getSpaceById is not provided', async () => {
      const factory = new AlertingAuthorizationClientFactory();
      // Initialize without getSpaceById
      factory.initialize({
        ...alertingAuthorizationClientFactoryParams,
        getSpaceById: undefined,
      });

      const request = mockRouter.createKibanaRequest();
      await factory.createForSpace(request, 'custom-space');

      // Should have logged a debug message about the fallback
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('getSpaceById is not available')
      );

      // Should have called create() via AlertingAuthorization.create with request-derived space functions
      const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
      expect(AlertingAuthorization.create).toHaveBeenCalledWith({
        request,
        ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
        features: alertingAuthorizationClientFactoryParams.features,
        getSpace: expect.any(Function),
        getSpaceId: expect.any(Function),
      });
    });

    it('creates an alerting authorization client scoped to the provided spaceId when getSpaceById is available', async () => {
      const getSpaceById = jest
        .fn()
        .mockResolvedValue({ id: 'custom-space', name: 'Custom Space' });
      const factory = new AlertingAuthorizationClientFactory();
      factory.initialize({
        ...alertingAuthorizationClientFactoryParams,
        securityPluginStart,
        getSpaceById,
      });

      const request = mockRouter.createKibanaRequest();
      await factory.createForSpace(request, 'custom-space');

      const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
      expect(AlertingAuthorization.create).toHaveBeenCalledWith({
        request,
        authorization: securityPluginStart.authz,
        ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
        features: alertingAuthorizationClientFactoryParams.features,
        getSpace: expect.any(Function),
        getSpaceId: expect.any(Function),
      });

      // Verify that getSpaceId returns the provided spaceId
      const createCall = AlertingAuthorization.create.mock.calls[0][0];
      expect(createCall.getSpaceId()).toBe('custom-space');

      // Verify that getSpace calls getSpaceById with the provided spaceId
      await createCall.getSpace(request);
      expect(getSpaceById).toHaveBeenCalledWith(request, 'custom-space');
    });
  });
});
