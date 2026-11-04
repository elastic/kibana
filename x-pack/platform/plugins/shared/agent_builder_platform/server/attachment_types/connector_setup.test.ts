/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type {
  Attachment,
  VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import type { AgentsStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
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

const makeAgentsStart = (connectorIds?: string[]) => {
  const update = jest.fn().mockResolvedValue({});
  const get = jest.fn().mockResolvedValue({ configuration: { connector_ids: connectorIds } });
  const getRegistry = jest.fn().mockResolvedValue({ get, update });
  return { agentsStart: { getRegistry } as unknown as AgentsStart, get, update };
};

const makeActionsStart = (
  connector: { actionTypeId: string } | Error = { actionTypeId: '.github' }
) => {
  const get = jest.fn();
  if (connector instanceof Error) {
    get.mockRejectedValue(connector);
  } else {
    get.mockResolvedValue({ id: 'new-connector', ...connector });
  }
  const getActionsClientWithRequest = jest.fn().mockResolvedValue({ get });
  return { actionsStart: { getActionsClientWithRequest } as unknown as ActionsPluginStart, get };
};

const completedAttachment = {
  id: 'test-attachment-id',
  type: CONNECTOR_SETUP_ATTACHMENT_TYPE,
  origin: 'new-connector',
  versions: [],
  current_version: 1,
} as VersionedAttachmentWithOrigin<
  typeof CONNECTOR_SETUP_ATTACHMENT_TYPE,
  ConnectorSetupAttachmentData
>;

const originContext = {
  request: httpServerMock.createKibanaRequest(),
  conversationId: 'conversation-1',
  agentId: 'my-agent',
  canManageAgents: true,
};

describe('connector_setup attachment type', () => {
  const attachmentType = createConnectorSetupAttachmentType({
    getAgentsStart: async () => makeAgentsStart().agentsStart,
    getActionsStart: async () => makeActionsStart().actionsStart,
    logger: loggingSystemMock.createLogger(),
  });

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

  describe('onOriginUpdated', () => {
    const createType = (
      agentsStart: AgentsStart,
      actionsStart: ActionsPluginStart = makeActionsStart().actionsStart
    ) =>
      createConnectorSetupAttachmentType({
        getAgentsStart: async () => agentsStart,
        getActionsStart: async () => actionsStart,
        logger: loggingSystemMock.createLogger(),
      });

    beforeEach(() => {
      getConnectorSpecMock.mockImplementation((id: string) =>
        id === '.github' ? ({ metadata: { id: '.github' }, actions: {} } as never) : undefined
      );
    });

    it('appends the created connector to the conversation agent connector_ids', async () => {
      const { agentsStart, update } = makeAgentsStart(['existing']);

      await createType(agentsStart).onOriginUpdated!(completedAttachment, originContext);

      expect(update).toHaveBeenCalledWith('my-agent', {
        configuration: { connector_ids: ['existing', 'new-connector'] },
      });
    });

    it('starts a new list when the agent has no connector_ids', async () => {
      const { agentsStart, update } = makeAgentsStart(undefined);

      await createType(agentsStart).onOriginUpdated!(completedAttachment, originContext);

      expect(update).toHaveBeenCalledWith('my-agent', {
        configuration: { connector_ids: ['new-connector'] },
      });
    });

    it('does not update the agent when the connector is already assigned', async () => {
      const { agentsStart, update } = makeAgentsStart(['new-connector']);

      await createType(agentsStart).onOriginUpdated!(completedAttachment, originContext);

      expect(update).not.toHaveBeenCalled();
    });

    it('rejects with a readable message and assigns nothing without the manage agents privilege', async () => {
      const { agentsStart, update } = makeAgentsStart([]);
      const { actionsStart, get } = makeActionsStart();

      await expect(
        createType(agentsStart, actionsStart).onOriginUpdated!(completedAttachment, {
          ...originContext,
          canManageAgents: false,
        })
      ).rejects.toThrow('Create and edit agents');
      expect(get).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it("uses the connector's real type, not the attachment data, to decide if it is callable", async () => {
      const { agentsStart, update } = makeAgentsStart([]);
      const { actionsStart } = makeActionsStart({ actionTypeId: '.email' });
      const claimsCallableType = {
        ...completedAttachment,
        versions: [{ version: 1, data: { connector_type: '.github' } }],
      } as unknown as typeof completedAttachment;

      await createType(agentsStart, actionsStart).onOriginUpdated!(
        claimsCallableType,
        originContext
      );

      expect(update).not.toHaveBeenCalled();
    });

    it('does not assign a connector that does not exist or is not visible to the user', async () => {
      const { agentsStart, update } = makeAgentsStart([]);
      const { actionsStart } = makeActionsStart(new Error('Saved object [action/x] not found'));

      await expect(
        createType(agentsStart, actionsStart).onOriginUpdated!(completedAttachment, originContext)
      ).rejects.toThrow('not found');
      expect(update).not.toHaveBeenCalled();
    });

    it('propagates update failures so the route can log them', async () => {
      const { agentsStart, update } = makeAgentsStart([]);
      update.mockRejectedValue(new Error("Agent my-agent is read-only and can't be updated"));

      await expect(
        createType(agentsStart).onOriginUpdated!(completedAttachment, originContext)
      ).rejects.toThrow('read-only');
    });
  });
});
