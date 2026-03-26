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

const WORKFLOW_YAML_WITH_TAG = `
name: test.workflow
description: A test workflow tool
tags:
  - agent-builder-tool
steps:
  - id: step1
    type: action
`;

const WORKFLOW_YAML_WITHOUT_TAG = `
name: test.other
description: Not an AB tool
tags:
  - some-other-tag
steps:
  - id: step1
    type: action
`;

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  getWorkflowTemplatesForConnector: jest.fn(),
}));

const { getConnectorSpec, getWorkflowTemplatesForConnector } =
  jest.requireMock('@kbn/connector-specs');

const mockSavedObjectsClient = {
  get: jest.fn(),
};

const mockToolRegistry = {
  list: jest.fn(),
};

const mockGetToolRegistry = jest.fn().mockResolvedValue(mockToolRegistry);
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
    getToolRegistry: mockGetToolRegistry,
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
    it('returns chunk with connector name, description, and tool descriptions in content', async () => {
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
      });

      getWorkflowTemplatesForConnector.mockReturnValue([
        WORKFLOW_YAML_WITH_TAG,
        WORKFLOW_YAML_WITHOUT_TAG,
      ]);

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith('action', 'conn-1');
      expect(result).toEqual({
        chunks: [
          {
            type: 'connector',
            title: 'My MCP Connector',
            content:
              'My MCP Connector\nMCP\nModel Context Protocol connector\nA test workflow tool',
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
      });

      getWorkflowTemplatesForConnector.mockReturnValue([]);

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      // 'MCP' should appear only once even though name === displayName
      expect(result!.chunks[0].content).toBe('MCP\nModel Context Protocol connector');
    });

    it('handles missing optional fields gracefully', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'Basic Connector', actionTypeId: '.unknown' },
        references: [],
      });

      getConnectorSpec.mockReturnValue(undefined);
      getWorkflowTemplatesForConnector.mockReturnValue([WORKFLOW_YAML_WITH_TAG]);

      const result = await connectorSmlType.getSmlData!('conn-1', createContext() as never);

      expect(result!.chunks[0]).toEqual({
        type: 'connector',
        title: 'Basic Connector',
        content: 'Basic Connector\n.unknown\nA test workflow tool',
        permissions: ['action:execute'],
      });
    });
  });

  describe('toAttachment', () => {
    it('returns connector attachment with correct shape and tools from registry', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'My MCP Connector', actionTypeId: '.mcp' },
        references: [],
      });

      mockToolRegistry.list.mockResolvedValue([
        {
          id: 'mcp.my-mcp.search',
          type: 'workflow',
          description: 'Search tool',
          readonly: false,
          tags: ['connector', 'mcp', 'connector:conn-1'],
          configuration: { workflow_id: 'wf-1' },
        },
        {
          id: 'mcp.my-mcp.fetch',
          type: 'workflow',
          description: 'Fetch tool',
          readonly: false,
          tags: ['connector', 'mcp', 'connector:conn-1'],
          configuration: { workflow_id: 'wf-2' },
        },
      ]);

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        createAttachmentContext() as never
      );

      expect(mockToolRegistry.list).toHaveBeenCalledWith({ tags: ['connector:conn-1'] });
      expect(result).toEqual({
        type: AttachmentType.connector,
        data: {
          connector_id: 'conn-1',
          connector_name: 'My MCP Connector',
          connector_type: '.mcp',
          tools: [
            {
              tool_id: 'mcp.my-mcp.search',
              description: 'Search tool',
              configuration: { workflow_id: 'wf-1' },
            },
            {
              tool_id: 'mcp.my-mcp.fetch',
              description: 'Fetch tool',
              configuration: { workflow_id: 'wf-2' },
            },
          ],
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

    it('returns attachment with empty tools when no tools match the connector tag', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'My Connector', actionTypeId: '.mcp' },
        references: [],
      });

      mockToolRegistry.list.mockResolvedValue([]);

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        createAttachmentContext() as never
      );

      expect(result).toEqual({
        type: AttachmentType.connector,
        data: {
          connector_id: 'conn-1',
          connector_name: 'My Connector',
          connector_type: '.mcp',
          tools: [],
        },
      });
    });

    it('defaults workflow_id to empty string when tool configuration is missing it', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'Conn', actionTypeId: '.mcp' },
        references: [],
      });

      mockToolRegistry.list.mockResolvedValue([
        {
          id: 'mcp.tool',
          type: 'workflow',
          description: 'Tool without workflow_id',
          readonly: false,
          tags: ['connector:conn-1'],
          configuration: {},
        },
      ]);

      const result = await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        createAttachmentContext() as never
      );

      expect(result).toEqual({
        type: AttachmentType.connector,
        data: {
          connector_id: 'conn-1',
          connector_name: 'Conn',
          connector_type: '.mcp',
          tools: [
            {
              tool_id: 'mcp.tool',
              description: 'Tool without workflow_id',
              configuration: { workflow_id: '' },
            },
          ],
        },
      });
    });

    it('uses the correct tool registry scoped to request', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'conn-1',
        type: 'action',
        attributes: { name: 'Conn', actionTypeId: '.mcp' },
        references: [],
      });
      mockToolRegistry.list.mockResolvedValue([]);

      const attachmentContext = createAttachmentContext();
      await connectorSmlType.toAttachment!(
        { origin_id: 'conn-1' } as never,
        attachmentContext as never
      );

      expect(mockGetToolRegistry).toHaveBeenCalledWith(attachmentContext.request);
    });
  });
});
