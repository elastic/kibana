/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SmlListItem } from '@kbn/agent-builder-plugin/server';
import { createConnectorSmlType } from './connector';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
}));

const { getConnectorSpec } = jest.requireMock('@kbn/connector-specs');

const mockSavedObjectsClient = {
  get: jest.fn(),
};

const createContext = () => ({
  logger: loggingSystemMock.createLogger(),
  savedObjectsClient: mockSavedObjectsClient as any,
});

async function collectPages(iterable: AsyncIterable<SmlListItem[]>): Promise<SmlListItem[]> {
  const items: SmlListItem[] = [];
  for await (const page of iterable) {
    items.push(...page);
  }
  return items;
}

describe('connectorSmlType', () => {
  const connectorSmlType = createConnectorSmlType();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('equals connector', () => {
      expect(connectorSmlType.id).toBe('connector');
    });
  });

  describe('list', () => {
    it('yields nothing — connector indexing is event-driven only', async () => {
      const result = await collectPages(connectorSmlType.list(createContext() as never));
      expect(result).toEqual([]);
    });
  });

  describe('getSmlData', () => {
    it('returns chunk with connector name and description in content', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'My MCP Connector', actionTypeId: '.mcp' },
        references: [],
      });

      getConnectorSpec.mockReturnValue({
        metadata: {
          id: '.mcp',
          displayName: 'MCP',
          description: 'Model Context Protocol connector',
        },
        actions: {},
      });

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith('action', 'conn-1');
      expect(result).toEqual({
        chunks: [
          {
            type: 'connector',
            title: 'My MCP Connector',
            content: 'My MCP Connector\nMCP\nModel Context Protocol connector',
            permissions: ['action:execute'],
          },
        ],
      });
    });

    it('returns undefined on error and logs warning', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Not found'));
      const context = createContext();

      const result = await connectorSmlType.getSmlData!('missing-conn', context as never);

      expect(result).toBeUndefined();
      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to get data for 'missing-conn'")
      );
    });

    it('deduplicates content parts when name and displayName overlap', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'MCP', actionTypeId: '.mcp' },
        references: [],
      });

      getConnectorSpec.mockReturnValue({
        metadata: {
          id: '.mcp',
          displayName: 'MCP',
          description: 'Model Context Protocol connector',
        },
        actions: {},
      });

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      // 'MCP' should appear only once even though name === displayName
      expect(result!.chunks[0].content).toBe('MCP\nModel Context Protocol connector');
    });

    it('includes sub-action descriptions when spec has isTool actions', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'My Slack', actionTypeId: '.slack2' },
        references: [],
      });

      getConnectorSpec.mockReturnValue({
        metadata: {
          id: '.slack2',
          displayName: 'Slack',
          description: 'Search and send Slack messages',
        },
        actions: {
          searchMessages: {
            isTool: true,
            description: 'Search Slack messages',
            handler: jest.fn(),
          },
          sendMessage: {
            isTool: true,
            description: 'Send a message to a channel',
            handler: jest.fn(),
          },
          internalAction: {
            isTool: false,
            description: 'Internal only',
            handler: jest.fn(),
          },
        },
      });

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      expect(result!.chunks[0].content).toContain('searchMessages: Search Slack messages');
      expect(result!.chunks[0].content).toContain('sendMessage: Send a message to a channel');
      expect(result!.chunks[0].content).not.toContain('internalAction');
    });

    it('handles missing optional fields gracefully', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'Basic Connector', actionTypeId: '.unknown' },
        references: [],
      });

      getConnectorSpec.mockReturnValue(undefined);

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      expect(result!.chunks[0]).toEqual({
        type: 'connector',
        title: 'Basic Connector',
        content: 'Basic Connector\n.unknown',
        permissions: ['action:execute'],
      });
    });
  });

  describe('originType', () => {
    it('declares connector as the origin type', () => {
      expect(connectorSmlType.originType).toBe('connector');
    });
  });
});
