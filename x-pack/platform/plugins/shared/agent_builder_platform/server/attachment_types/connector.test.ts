/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  type ConnectorAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { createConnectorAttachmentType } from './connector';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
}));

jest.mock('@kbn/agent-builder-server', () => ({
  ...jest.requireActual('@kbn/agent-builder-server'),
  formatSchemaForLlm: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;
const formatSchemaForLlmMock = formatSchemaForLlm as jest.MockedFunction<typeof formatSchemaForLlm>;

const createAttachment = (
  data: ConnectorAttachmentData
): Attachment<AttachmentType.connector, ConnectorAttachmentData> => ({
  id: 'test-attachment-id',
  type: AttachmentType.connector,
  data,
});

const validData: ConnectorAttachmentData = {
  connector_id: 'connector-123',
  connector_name: 'My Github Connector',
  connector_type: '.github',
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

describe('connector attachment type', () => {
  const connectorType = createConnectorAttachmentType();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('accepts valid connector data', () => {
      const result = connectorType.validate(validData);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('rejects data missing connector_id', () => {
      const { connector_id: _, ...data } = validData;
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data missing connector_name', () => {
      const { connector_name: _, ...data } = validData;
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data missing connector_type', () => {
      const { connector_type: _, ...data } = validData;
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    describe('getRepresentation', () => {
      it('returns text with connector name and description when no spec is found', () => {
        getConnectorSpecMock.mockReturnValue(undefined);

        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const representation = formatted.getRepresentation!();

        expect(representation).toEqual({
          type: 'text',
          value: expect.stringContaining('My Github Connector'),
        });
        expect((representation as { value: string }).value).toContain(
          'platform.core.execute_connector_sub_action'
        );
        expect((representation as { value: string }).value).toContain(
          '"connectorId":"connector-123"'
        );
      });

      it('uses metadata.description from connector spec when available', () => {
        getConnectorSpecMock.mockReturnValue({
          metadata: {
            id: '.github',
            displayName: 'GitHub',
            description: 'Generic GitHub connector',
            minimumLicense: 'enterprise',
            supportedFeatureIds: [],
          },
          actions: {},
        });

        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const representation = formatted.getRepresentation!() as { value: string };

        expect(representation.value).toContain('Generic GitHub connector');
        expect(representation.value).toContain('platform.core.execute_connector_sub_action');
      });

      it('falls back to connector_type when no spec is found', () => {
        getConnectorSpecMock.mockReturnValue(undefined);

        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const representation = formatted.getRepresentation!() as { value: string };

        expect(representation.value).toContain('Description: .github');
        expect(representation.value).toContain('"connectorId":"connector-123"');
      });

      it('lists sub-actions from ConnectorSpec when available', () => {
        const inputSchema = z.object({
          query: z.string().describe('Search query'),
        });
        getConnectorSpecMock.mockReturnValue({
          metadata: {
            id: '.slack2',
            displayName: 'Slack',
            description: 'Search and send Slack messages',
            minimumLicense: 'enterprise',
            supportedFeatureIds: [],
          },
          actions: {
            searchMessages: {
              isTool: true,
              description: 'Search Slack messages',
              input: inputSchema,
              handler: jest.fn(),
            },
            sendMessage: {
              isTool: true,
              description: 'Send a message to a channel',
              input: inputSchema,
              handler: jest.fn(),
            },
            internalAction: {
              isTool: false,
              description: 'Internal only',
              input: inputSchema,
              handler: jest.fn(),
            },
          },
        });
        formatSchemaForLlmMock.mockReturnValue('query (string, required): Search query');

        const attachment = createAttachment({
          ...validData,
          connector_type: '.slack2',
        });
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const representation = formatted.getRepresentation!() as { value: string };

        expect(representation.value).toContain('execute_connector_sub_action');
        expect(representation.value).toContain('searchMessages: Search Slack messages');
        expect(representation.value).toContain('sendMessage: Send a message to a channel');
        expect(representation.value).not.toContain('internalAction');
        expect(representation.value).toContain('Connector ID: connector-123');
        expect(representation.value).toContain('Required JSON shape for tool');
        expect(representation.value).toContain(
          '"connectorId":"connector-123","subAction":"<sub-action name>","params":{ ... }'
        );
      });

      it('includes skill content when spec has skill', () => {
        const inputSchema = z.object({});
        getConnectorSpecMock.mockReturnValue({
          metadata: {
            id: '.slack2',
            displayName: 'Slack',
            description: 'Slack connector',
            minimumLicense: 'enterprise',
            supportedFeatureIds: [],
          },
          actions: {
            sendMessage: {
              isTool: true,
              description: 'Send a message',
              input: inputSchema,
              handler: jest.fn(),
            },
          },
          skill: 'Always resolve channel ID before sending a message.',
        });
        formatSchemaForLlmMock.mockReturnValue('No parameters');

        const attachment = createAttachment({
          ...validData,
          connector_type: '.slack2',
        });
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const representation = formatted.getRepresentation!() as { value: string };

        expect(representation.value).toContain(
          'Always resolve channel ID before sending a message.'
        );
      });
    });

    describe('getBoundedTools', () => {
      it('always returns empty array', () => {
        getConnectorSpecMock.mockReturnValue(undefined);

        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const boundedTools = formatted.getBoundedTools!();

        expect(boundedTools).toEqual([]);
      });

      it('returns empty array when spec has sub-actions', () => {
        const inputSchema = z.object({});
        getConnectorSpecMock.mockReturnValue({
          metadata: {
            id: '.slack2',
            displayName: 'Slack',
            description: 'Slack connector',
            minimumLicense: 'enterprise',
            supportedFeatureIds: [],
          },
          actions: {
            searchMessages: {
              isTool: true,
              description: 'Search messages',
              input: inputSchema,
              handler: jest.fn(),
            },
          },
        });

        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const boundedTools = formatted.getBoundedTools!();

        expect(boundedTools).toEqual([]);
      });
    });
  });

  describe('getTools', () => {
    it('returns empty array', () => {
      expect(connectorType.getTools!()).toEqual([]);
    });
  });

  describe('getAgentDescription', () => {
    it('documents platform tool id and required JSON envelope', () => {
      const description = connectorType.getAgentDescription!();
      expect(description).toContain('platform.core.execute_connector_sub_action');
      expect(description).toContain('connectorId');
      expect(description).toContain('subAction');
      expect(description).toContain('params');
    });
  });

  describe('isReadonly', () => {
    it('is true', () => {
      expect(connectorType.isReadonly).toBe(true);
    });
  });
});
