/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SmlListItem } from '@kbn/agent-builder-plugin/server';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { createConnectorSmlType } from './connector';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
}));

const { getConnectorSpec } = jest.requireMock('@kbn/connector-specs');

const mockSavedObjectsClient = {
  get: jest.fn(),
};

const mockGetActionSavedObjectsClient = jest.fn().mockResolvedValue(mockSavedObjectsClient);
const mockLogger = loggingSystemMock.createLogger();

const createContext = () => ({
  logger: loggingSystemMock.createLogger(),
  request: httpServerMock.createKibanaRequest(),
});

const createAttachmentContext = () => ({
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
});

async function collectPages(iterable: AsyncIterable<SmlListItem[]>): Promise<SmlListItem[]> {
  const items: SmlListItem[] = [];
  for await (const page of iterable) {
    items.push(...page);
  }
  return items;
}

describe('connectorSmlType', () => {
  const connectorSmlType = createConnectorSmlType({
    getActionSavedObjectsClient: mockGetActionSavedObjectsClient,
    logger: mockLogger,
  });

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

    it('throws when request is not available', async () => {
      const context = { logger: loggingSystemMock.createLogger() };

      await expect(connectorSmlType.getSmlData!('conn-1', context as never)).rejects.toThrow(
        'no request available'
      );
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

  describe('toAttachment', () => {
    it('returns connector attachment data', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'My MCP Connector', actionTypeId: '.mcp' },
        references: [],
      });

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        createAttachmentContext() as never
      );

      expect(result).toEqual({
        type: AttachmentType.connector,
        data: {
          connector_id: 'conn-1',
          connector_name: 'My MCP Connector',
          connector_type: '.mcp',
        },
      });
    });

    it('returns undefined and logs warning when connector is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Not found'));

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'missing-conn' } as never,
        createAttachmentContext() as never
      );

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to convert 'missing-conn' to attachment")
      );
    });

    it('defaults connector_name to origin_id when name attribute is missing', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { actionTypeId: '.mcp' },
        references: [],
      });

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        createAttachmentContext() as never
      );

      expect(result).toEqual({
        type: AttachmentType.connector,
        data: {
          connector_id: 'conn-1',
          connector_name: 'conn-1',
          connector_type: '.mcp',
        },
      });
    });
  });
});
