/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { hasAnyDefaultLLMConnectors, updateDefaultLLMActions } from './update_default_llm_actions';
import { defaultLLMConnectors } from './default_llm_connectors';
import type { ActionsClient } from '@kbn/actions-plugin/server';

describe('update_default_llm_actions', () => {
  describe('hasAnyDefaultLLMConnectors', () => {
    it('returns true when inference connector with chat_completion taskType exists', async () => {
      const mockActionsClient = {
        getAll: jest.fn().mockResolvedValue([
          {
            id: 'existing-connector',
            actionTypeId: '.inference',
            config: { taskType: 'chat_completion' },
          },
        ]),
      } as unknown as ActionsClient;

      const result = await hasAnyDefaultLLMConnectors(mockActionsClient);

      expect(result).toBe(true);
    });

    it('returns false when no connectors exist', async () => {
      const mockActionsClient = {
        getAll: jest.fn().mockResolvedValue([]),
      } as unknown as ActionsClient;

      const result = await hasAnyDefaultLLMConnectors(mockActionsClient);

      expect(result).toBe(false);
    });

    it('returns false when inference connector exists but with different taskType', async () => {
      const mockActionsClient = {
        getAll: jest.fn().mockResolvedValue([
          {
            id: 'existing-connector',
            actionTypeId: '.inference',
            config: { taskType: 'text_embedding' },
          },
        ]),
      } as unknown as ActionsClient;

      const result = await hasAnyDefaultLLMConnectors(mockActionsClient);

      expect(result).toBe(false);
    });

    it('returns false when non-inference connectors exist', async () => {
      const mockActionsClient = {
        getAll: jest.fn().mockResolvedValue([
          {
            id: 'existing-connector',
            actionTypeId: '.slack',
            config: {},
          },
        ]),
      } as unknown as ActionsClient;

      const result = await hasAnyDefaultLLMConnectors(mockActionsClient);

      expect(result).toBe(false);
    });
  });

  describe('updateDefaultLLMActions', () => {
    let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
    let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
    let mockActionsClient: jest.Mocked<Partial<ActionsClient>>;
    let mockGetStartServices: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockLogger = loggingSystemMock.createLogger();
      mockRequest = httpServerMock.createKibanaRequest();

      mockActionsClient = {
        getAll: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      };
    });

    const createMockGetStartServices = (hasPrivilege: boolean) => {
      return jest.fn().mockResolvedValue([
        {
          capabilities: {
            resolveCapabilities: jest.fn().mockResolvedValue({
              actions: { save: hasPrivilege },
            }),
          },
        },
        {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
          },
        },
      ]);
    };

    it('skips creation when user lacks actions.save privilege', async () => {
      mockGetStartServices = createMockGetStartServices(false);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Not enough privileges to update default llm actions..'
      );
      expect(mockActionsClient.create).not.toHaveBeenCalled();
    });

    it('skips creation when default LLM connectors already exist', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockActionsClient.getAll!.mockResolvedValue([
        {
          id: 'existing-llm',
          actionTypeId: '.inference',
          config: { taskType: 'chat_completion' },
        },
      ] as any);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Default LLM connectors already exist, skipping creation'
      );
      expect(mockActionsClient.create).not.toHaveBeenCalled();
    });

    it('creates missing connectors when none exist', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockActionsClient.getAll!.mockResolvedValue([]);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      expect(mockActionsClient.create).toHaveBeenCalledTimes(defaultLLMConnectors.length);

      // Verify each connector from the config is created
      for (const connector of defaultLLMConnectors) {
        expect(mockActionsClient.create).toHaveBeenCalledWith({
          action: {
            actionTypeId: connector.actionTypeId,
            name: connector.name,
            config: connector.config,
            secrets: {},
          },
          options: { id: connector.id },
        });
      }
    });

    it('skips connectors that already exist by ID', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      const firstConnector = defaultLLMConnectors[0];
      const secondConnector = defaultLLMConnectors[1];

      // First call returns no LLM connectors (so hasAnyDefaultLLMConnectors returns false)
      // Second call returns a connector with matching ID
      mockActionsClient.getAll!.mockResolvedValue([
        {
          id: firstConnector.id,
          actionTypeId: '.slack', // Different type, so hasAnyDefaultLLMConnectors returns false
          config: {},
        },
      ] as any);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      // Should skip the first connector and create the rest
      expect(mockActionsClient.create).toHaveBeenCalledTimes(defaultLLMConnectors.length - 1);
      expect(mockActionsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { id: secondConnector.id },
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Default LLM connector "${firstConnector.name}" already exists, skipping`
      );
    });

    it('logs warning when connector creation fails', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockActionsClient.getAll!.mockResolvedValue([]);
      mockActionsClient.create!.mockRejectedValueOnce(new Error('Creation failed'));

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      const firstConnector = defaultLLMConnectors[0];
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to create default LLM connector "${firstConnector.name}": Creation failed`
      );
      // Should continue to create the remaining connectors
      expect(mockActionsClient.create).toHaveBeenCalledTimes(defaultLLMConnectors.length);
    });

    it('logs info when connector is created successfully', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockActionsClient.getAll!.mockResolvedValue([]);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      // Verify each connector logs a success message
      for (const connector of defaultLLMConnectors) {
        expect(mockLogger.info).toHaveBeenCalledWith(
          `Created default LLM connector: ${connector.name}`
        );
      }
    });
  });
});
