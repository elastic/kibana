/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { createConnectorLifecycleHandler } from './connector_lifecycle_handler';

const createMockUiSettingsClient = (experimentalFeaturesEnabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) return experimentalFeaturesEnabled;
    return undefined;
  }),
});

const createMockSmlService = () => ({
  indexAttachment: jest.fn().mockResolvedValue(undefined),
});

const createMockServiceManager = (
  uiSettingsClient = createMockUiSettingsClient(),
  sml = createMockSmlService()
) => ({
  internalStart: {
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue({}),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
    },
    sml,
  },
});

const createMockGetStartServices = () =>
  jest.fn().mockResolvedValue([
    {
      elasticsearch: { client: { asInternalUser: {} } },
      savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) },
    },
    { spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('default') } } },
    {},
  ]);

const createBaseParams = (overrides = {}) => ({
  connectorId: 'connector-abc',
  connectorName: 'My Test Connector',
  connectorType: '.test',
  config: {},
  secrets: {},
  logger: loggingSystemMock.create().get(),
  request: {} as any,
  services: { scopedClusterClient: {} as any },
  wasSuccessful: true,
  ...overrides,
});

describe('createConnectorLifecycleHandler', () => {
  const logger = loggingSystemMock.create().get('connector-lifecycle');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onPostCreate', () => {
    it('skips unsuccessful saves', async () => {
      const sml = createMockSmlService();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockUiSettingsClient(), sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(createBaseParams({ wasSuccessful: false }) as any);

      expect(sml.indexAttachment).not.toHaveBeenCalled();
    });

    it('skips when connectors feature is disabled', async () => {
      const uiSettingsClient = createMockUiSettingsClient(false);
      const sml = createMockSmlService();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(uiSettingsClient, sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(sml.indexAttachment).not.toHaveBeenCalled();
    });

    it('indexes connector into SML', async () => {
      const sml = createMockSmlService();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockUiSettingsClient(), sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(sml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'create',
        })
      );
    });

    it('logs warning but does not throw when sml.indexAttachment fails', async () => {
      const sml = createMockSmlService();
      sml.indexAttachment.mockRejectedValue(new Error('SML error'));
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockUiSettingsClient(), sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(handler.onPostCreate(createBaseParams() as any)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to index connector')
      );
    });

    it('returns early when services are not started', async () => {
      const handler = createConnectorLifecycleHandler({
        serviceManager: { internalStart: undefined } as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('services not started yet')
      );
    });
  });

  describe('onPostDelete', () => {
    it('removes connector from SML', async () => {
      const sml = createMockSmlService();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockUiSettingsClient(), sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any);

      expect(sml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'delete',
        })
      );
    });

    it('logs warning but does not throw when SML delete fails', async () => {
      const sml = createMockSmlService();
      sml.indexAttachment.mockRejectedValue(new Error('SML delete error'));
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockUiSettingsClient(), sml) as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(
        handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to remove connector')
      );
    });

    it('returns early when services are not started', async () => {
      const handler = createConnectorLifecycleHandler({
        serviceManager: { internalStart: undefined } as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostDelete(createBaseParams() as any);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('services not started yet')
      );
    });

    it('logs warning but does not throw when getStartServices fails during SML delete', async () => {
      const getStartServices = jest.fn().mockRejectedValue(new Error('start services failed'));
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        logger,
        getStartServices,
      });

      await expect(
        handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to remove connector')
      );
    });
  });
});
