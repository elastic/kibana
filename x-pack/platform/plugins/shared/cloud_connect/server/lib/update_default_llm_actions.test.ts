/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { hasAnyDefaultLLMConnectors, updateDefaultLLMActions } from './update_default_llm_actions';
import { defaultLLMConnectors } from './default_llm_connectors';

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
  });

  describe('updateDefaultLLMActions', () => {
    let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
    let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
    let mockGetAll: jest.Mock;
    let mockCreate: jest.Mock;
    let mockGetStartServices: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockLogger = loggingSystemMock.createLogger();
      mockRequest = httpServerMock.createKibanaRequest();

      mockGetAll = jest.fn().mockResolvedValue([]);
      mockCreate = jest.fn().mockResolvedValue({});
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
            getActionsClientWithRequest: jest.fn().mockResolvedValue({
              getAll: mockGetAll,
              create: mockCreate,
            }),
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
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('skips creation when default LLM connectors already exist', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockGetAll.mockResolvedValue([
        {
          id: 'existing-llm',
          actionTypeId: '.inference',
          config: { taskType: 'chat_completion' },
        },
      ]);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Default LLM connectors already exist, skipping creation'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates missing connectors when none exist', async () => {
      mockGetStartServices = createMockGetStartServices(true);
      mockGetAll.mockResolvedValue([]);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      expect(mockCreate).toHaveBeenCalledTimes(defaultLLMConnectors.length);

      // Verify each connector from the config is created
      for (const connector of defaultLLMConnectors) {
        expect(mockCreate).toHaveBeenCalledWith({
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
      mockGetAll.mockResolvedValue([
        {
          id: firstConnector.id,
          actionTypeId: '.slack', // Different type, so hasAnyDefaultLLMConnectors returns false
          config: {},
        },
      ]);

      await updateDefaultLLMActions(mockGetStartServices, mockRequest, mockLogger);

      // Should skip the first connector and create the rest
      expect(mockCreate).toHaveBeenCalledTimes(defaultLLMConnectors.length - 1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { id: secondConnector.id },
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Default LLM connector "${firstConnector.name}" already exists, skipping`
      );
    });
  });
});
