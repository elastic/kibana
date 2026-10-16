/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import {
  CONNECTOR_SETUP_ATTACHMENT_TYPE,
  type ConnectorSetupAttachmentData,
} from '../../common/attachments';
import { createConnectorSetupAttachmentType } from './connector_setup';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

const createAttachment = (
  data: ConnectorSetupAttachmentData
): Attachment<typeof CONNECTOR_SETUP_ATTACHMENT_TYPE, ConnectorSetupAttachmentData> => ({
  id: 'test-attachment-id',
  type: CONNECTOR_SETUP_ATTACHMENT_TYPE,
  data,
});

const validData: ConnectorSetupAttachmentData = {
  connector_type: '.github',
  connector_type_name: 'GitHub',
  reason: 'Investigate issues across services',
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

describe('connector_setup attachment type', () => {
  const attachmentType = createConnectorSetupAttachmentType();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('accepts data with only connector_type', () => {
      const result = attachmentType.validate({ connector_type: '.slack' }, formatContext);
      expect(result).toEqual({ valid: true, data: { connector_type: '.slack' } });
    });

    it('accepts data with optional fields', () => {
      const result = attachmentType.validate(validData, formatContext);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('rejects data missing connector_type', () => {
      const { connector_type: _, ...data } = validData;
      const result = attachmentType.validate(data, formatContext);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    it('uses connector_type_name when provided', () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const formatted = attachmentType.format(
        createAttachment(validData),
        formatContext
      ) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { type: string; value: string };

      expect(representation.type).toBe('text');
      expect(representation.value).toContain('GitHub');
      expect(representation.value).toContain('.github');
      // Reassures the model that secrets are not collected in chat.
      expect(representation.value).toContain('never appear in chat');
    });

    it('falls back to the connector spec display name', () => {
      getConnectorSpecMock.mockReturnValue({
        metadata: {
          id: '.notion',
          displayName: 'Notion',
          description: 'Notion connector',
          minimumLicense: 'enterprise',
          supportedFeatureIds: [],
        },
        actions: {},
        test: { handler: jest.fn(), enabled: false },
      });

      const formatted = attachmentType.format(
        createAttachment({ connector_type: '.notion' }),
        formatContext
      ) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { value: string };

      expect(representation.value).toContain('Notion');
    });
  });

  describe('getAgentDescription', () => {
    it('describes the setup card and the render tag', () => {
      const description = attachmentType.getAgentDescription!();
      expect(description).toContain('connector_setup');
      expect(description).toContain('render_attachment');
    });
  });

  describe('toSurfaceComposition', () => {
    const toSurfaceComposition = async (data: ConnectorSetupAttachmentData, origin?: string) =>
      attachmentType.toSurfaceComposition?.({ ...createAttachment(data), origin }, formatContext);

    it('shows the reason, and asks to finish the setup in Kibana', async () => {
      expect(await toSurfaceComposition(validData)).toEqual({
        type: 'view',
        title: 'GitHub',
        subtitle: 'Setup',
        body: [
          {
            type: 'markdown',
            text: 'Investigate issues across services\n\nFinish setting it up in Kibana.',
          },
        ],
      });
    });

    it('shows the connector as connected once it has been created', async () => {
      const composition = await toSurfaceComposition(validData, 'connector-123');

      expect(composition?.subtitle).toBe('Connected');
      expect(composition?.body).toEqual([
        { type: 'markdown', text: 'Investigate issues across services' },
      ]);
    });

    it('falls back to the spec display name and a default reason', async () => {
      getConnectorSpecMock.mockReturnValue({
        metadata: {
          id: '.notion',
          displayName: 'Notion',
          description: 'Notion connector',
          minimumLicense: 'enterprise',
          supportedFeatureIds: [],
        },
        actions: {},
        test: { handler: jest.fn(), enabled: false },
      });

      const composition = await toSurfaceComposition({ connector_type: '.notion' });

      expect(composition?.title).toBe('Notion');
      expect(composition?.body).toEqual([
        {
          type: 'markdown',
          text: 'Configure the Notion connector so the agent can use it here.\n\nFinish setting it up in Kibana.',
        },
      ]);
    });

    it('falls back to the connector type when no spec is found', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      expect((await toSurfaceComposition({ connector_type: '.unknown' }))?.title).toBe('.unknown');
    });
  });
});
