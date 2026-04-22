/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { createConnectorLifecycleHandler } from './connector_lifecycle_handler';

const createMockRequest = () => ({}) as any;

const createMockStartServices = (overrides: {
  experimentalEnabled?: boolean;
  spaceId?: string;
  indexAttachment?: jest.Mock;
} = {}) => {
  const {
    experimentalEnabled = true,
    spaceId = 'default',
    indexAttachment = jest.fn().mockResolvedValue(undefined),
  } = overrides;

  const uiSettingsClient = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID) {
        return Promise.resolve(experimentalEnabled);
      }
      return Promise.resolve(false);
    }),
  };

  const coreStart = {
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue({}),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
    },
  };

  const startDeps = {
    semanticLayer: { indexAttachment },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue(spaceId),
      },
    },
  };

  const getStartServices = jest.fn().mockResolvedValue([coreStart, startDeps, {}]);

  return { coreStart, startDeps, getStartServices, indexAttachment, uiSettingsClient };
};

describe('createConnectorLifecycleHandler', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  describe('onPostCreate', () => {
    it('skips when wasSuccessful is false', async () => {
      const { getStartServices } = createMockStartServices();
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });

      await handler.onPostCreate({
        wasSuccessful: false,
        connectorId: 'c1',
        connectorType: '.test',
        request: createMockRequest(),
      } as any);

      expect(getStartServices).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('wasSuccessful=false')
      );
    });

    it('skips when experimental features flag is disabled', async () => {
      const { getStartServices, indexAttachment } = createMockStartServices({
        experimentalEnabled: false,
      });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });

      await handler.onPostCreate({
        wasSuccessful: true,
        connectorId: 'c1',
        connectorType: '.test',
        request: createMockRequest(),
      } as any);

      expect(indexAttachment).not.toHaveBeenCalled();
    });

    it('indexes the connector into SML on successful create', async () => {
      const { getStartServices, indexAttachment } = createMockStartServices({
        spaceId: 'my-space',
      });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });
      const request = createMockRequest();

      await handler.onPostCreate({
        wasSuccessful: true,
        connectorId: 'c1',
        connectorType: '.test',
        request,
      } as any);

      expect(indexAttachment).toHaveBeenCalledWith({
        request,
        originId: 'c1',
        attachmentType: AttachmentType.connector,
        action: 'create',
        spaceId: 'my-space',
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('indexed connector c1')
      );
    });

    it('logs a warning and does not throw when indexAttachment fails', async () => {
      const indexAttachment = jest.fn().mockRejectedValue(new Error('index failed'));
      const { getStartServices } = createMockStartServices({ indexAttachment });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });

      await expect(
        handler.onPostCreate({
          wasSuccessful: true,
          connectorId: 'c1',
          connectorType: '.test',
          request: createMockRequest(),
        } as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('index failed')
      );
    });
  });

  describe('onPostDelete', () => {
    it('deletes the connector from SML', async () => {
      const { getStartServices, indexAttachment } = createMockStartServices({
        spaceId: 'my-space',
      });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });
      const request = createMockRequest();

      await handler.onPostDelete({
        connectorId: 'c1',
        connectorType: '.test',
        request,
      } as any);

      expect(indexAttachment).toHaveBeenCalledWith({
        request,
        originId: 'c1',
        attachmentType: AttachmentType.connector,
        action: 'delete',
        spaceId: 'my-space',
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('removed connector c1')
      );
    });

    it('skips when experimental features flag is disabled', async () => {
      const { getStartServices, indexAttachment } = createMockStartServices({
        experimentalEnabled: false,
      });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });

      await handler.onPostDelete({
        connectorId: 'c1',
        connectorType: '.test',
        request: createMockRequest(),
      } as any);

      expect(indexAttachment).not.toHaveBeenCalled();
    });

    it('logs a warning and does not throw when indexAttachment fails', async () => {
      const indexAttachment = jest.fn().mockRejectedValue(new Error('delete failed'));
      const { getStartServices } = createMockStartServices({ indexAttachment });
      const handler = createConnectorLifecycleHandler({ logger, getStartServices });

      await expect(
        handler.onPostDelete({
          connectorId: 'c1',
          connectorType: '.test',
          request: createMockRequest(),
        } as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('delete failed')
      );
    });
  });
});
