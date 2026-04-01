/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ToolType } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  type ConnectorAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import { createConnectorAttachmentType } from './connector';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

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
  tools: [
    {
      tool_id: 'github.my-github.search_repos',
      description: 'Search GitHub repositories',
      configuration: { workflow_id: 'workflow-1' },
    },
    {
      tool_id: 'github.my-github.create_issue',
      description: 'Create a GitHub issue',
      configuration: { workflow_id: 'workflow-2' },
    },
  ],
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

    it('accepts valid data with empty tools array', () => {
      const data = { ...validData, tools: [] };
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: true, data });
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

    it('rejects data missing tools', () => {
      const { tools: _, ...data } = validData;
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects tools with missing workflow_id', () => {
      const data = {
        ...validData,
        tools: [{ tool_id: 'tool-1', description: 'desc', configuration: {} }],
      };
      const result = connectorType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    describe('getRepresentation', () => {
      it('returns text with connector name and tool descriptions', () => {
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
          'github.my-github.search_repos'
        );
        expect((representation as { value: string }).value).toContain('Search GitHub repositories');
        expect((representation as { value: string }).value).toContain(
          'github.my-github.create_issue'
        );
        expect((representation as { value: string }).value).toContain('Create a GitHub issue');
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
      });
    });

    describe('getBoundedTools', () => {
      it('returns WorkflowAttachmentBoundedTool entries with correct type and config', () => {
        const attachment = createAttachment(validData);
        const formatted = connectorType.format(
          attachment,
          formatContext
        ) as AgentFormattedAttachment;
        const boundedTools = formatted.getBoundedTools!();

        expect(boundedTools).toEqual([
          {
            id: 'github.my-github.search_repos',
            type: ToolType.workflow,
            description: 'Search GitHub repositories',
            configuration: { workflow_id: 'workflow-1' },
          },
          {
            id: 'github.my-github.create_issue',
            type: ToolType.workflow,
            description: 'Create a GitHub issue',
            configuration: { workflow_id: 'workflow-2' },
          },
        ]);
      });

      it('returns empty array when tools array is empty', () => {
        const attachment = createAttachment({ ...validData, tools: [] });
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
    it('returns a non-empty string', () => {
      const description = connectorType.getAgentDescription!();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  describe('isReadonly', () => {
    it('is true', () => {
      expect(connectorType.isReadonly).toBe(true);
    });
  });
});
