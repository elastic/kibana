/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createListConnectorTypesTool } from './list_connector_types';
import { createProposeConnectorTool } from './propose_connector';
import { CONNECTOR_SETUP_ATTACHMENT_TYPE } from '../../../common/attachments';
import { createConnectorSetupAttachmentType } from '../../attachment_types/connector_setup';

jest.mock('@kbn/connector-specs', () => ({
  connectorsSpecs: {},
  getConnectorSpec: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

const githubSpec = {
  metadata: {
    id: '.github',
    displayName: 'GitHub',
    description: 'Search repositories and issues',
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  auth: { types: ['bearer', { type: 'oauth_authorization_code' }] },
  actions: {
    searchRepositories: { isTool: true, description: 'Search repos', handler: jest.fn() },
    internalAction: { isTool: false, description: 'Internal', handler: jest.fn() },
  },
};

const makeActionsStart = (
  types: Array<{
    id: string;
    name: string;
    description?: string;
    minimumLicenseRequired?: string;
    isExperimental?: boolean;
    isSystemActionType?: boolean;
    isDeprecated?: boolean;
    enabledInConfig?: boolean;
    enabledInLicense?: boolean;
  }>
): ActionsPluginStart =>
  ({
    listTypes: jest.fn().mockReturnValue(
      types.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? '',
        minimumLicenseRequired: t.minimumLicenseRequired ?? 'basic',
        isExperimental: t.isExperimental ?? false,
        isSystemActionType: t.isSystemActionType ?? false,
        isDeprecated: t.isDeprecated ?? false,
        enabled: true,
        enabledInConfig: t.enabledInConfig ?? true,
        enabledInLicense: t.enabledInLicense ?? true,
        supportedFeatureIds: ['agentBuilder'],
      }))
    ),
  } as unknown as ActionsPluginStart);

/**
 * Build a minimal `ToolHandlerContext` carrying a real `AttachmentStateManager`
 * wired to the real `connector_setup` attachment type, so `propose_connector`
 * exercises the same validation pipeline the production runner uses (catching
 * drift between the tool schema and the attachment type's `validate`).
 */
const createTestContext = () => {
  const setupType = createConnectorSetupAttachmentType();
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === CONNECTOR_SETUP_ATTACHMENT_TYPE
        ? (setupType as unknown as AttachmentTypeDefinition)
        : undefined,
  });
  const context = { attachments } as unknown as ToolHandlerContext;
  return { context, attachments };
};

describe('connector-authoring inline tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list_connector_types', () => {
    it('returns connector types from the actions registry, enriched with spec data', async () => {
      getConnectorSpecMock.mockImplementation((id) =>
        id === '.github' ? (githubSpec as never) : undefined
      );

      const actionsStart = makeActionsStart([
        {
          id: '.github',
          name: 'GitHub',
          minimumLicenseRequired: 'enterprise',
          isExperimental: true,
        },
      ]);
      const tool = createListConnectorTypesTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        {},
        {} as ToolHandlerContext
      )) as ToolHandlerStandardReturn;

      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.other);
      const data = first.data as {
        connector_types: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.total).toBe(1);
      expect(actionsStart.listTypes).toHaveBeenCalledWith(AgentBuilderConnectorFeatureId);
      expect(data.connector_types[0]).toEqual(
        expect.objectContaining({
          connector_type: '.github',
          name: 'GitHub',
          auth_methods: ['bearer', 'oauth_authorization_code'],
          tool_actions: [{ name: 'searchRepositories', description: 'Search repos' }],
          available_in_chat: true,
        })
      );
    });

    it('prefers spec display name over registry name when they differ', async () => {
      getConnectorSpecMock.mockReturnValue({
        metadata: {
          id: '.slack2',
          displayName: 'Slack (v2)',
          description: 'Slack connector',
          minimumLicense: 'gold',
          supportedFeatureIds: ['agentBuilder'],
        },
        actions: {},
      } as never);

      const actionsStart = makeActionsStart([{ id: '.slack2', name: 'Slack' }]);
      const tool = createListConnectorTypesTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        {},
        {} as ToolHandlerContext
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        connector_types: Array<Record<string, unknown>>;
      };
      expect(data.connector_types[0]).toMatchObject({
        connector_type: '.slack2',
        name: 'Slack (v2)',
      });
    });

    it('returns non-spec connectors with basic registry metadata', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const actionsStart = makeActionsStart([
        {
          id: '.webhook',
          name: 'Webhook',
          description: 'Send a HTTP request',
          minimumLicenseRequired: 'gold',
        },
      ]);
      const tool = createListConnectorTypesTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        {},
        {} as ToolHandlerContext
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        connector_types: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.total).toBe(1);
      expect(data.connector_types[0]).toEqual(
        expect.objectContaining({
          connector_type: '.webhook',
          name: 'Webhook',
          description: 'Send a HTTP request',
          minimum_license: 'gold',
          auth_methods: [],
          tool_actions: [],
          available_in_chat: false,
        })
      );
    });

    it('marks the MCP connector as available in chat despite having no connector-specs entry', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const actionsStart = makeActionsStart([{ id: '.mcp', name: 'MCP' }]);
      const tool = createListConnectorTypesTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        {},
        {} as ToolHandlerContext
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        connector_types: Array<Record<string, unknown>>;
      };
      expect(data.connector_types[0]).toMatchObject({
        connector_type: '.mcp',
        available_in_chat: true,
      });
    });

    it('excludes system action types, deprecated types, config-disabled types, and unlicensed types', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const actionsStart = makeActionsStart([
        { id: '.system', name: 'System', isSystemActionType: true },
        { id: '.deprecated', name: 'Deprecated', isDeprecated: true },
        { id: '.disabled', name: 'Disabled', enabledInConfig: false },
        { id: '.unlicensed', name: 'Unlicensed', enabledInLicense: false },
        { id: '.normal', name: 'Normal' },
      ]);
      const tool = createListConnectorTypesTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        {},
        {} as ToolHandlerContext
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        connector_types: Array<Record<string, unknown>>;
        total: number;
      };
      expect(data.total).toBe(1);
      expect(data.connector_types[0]).toMatchObject({ connector_type: '.normal' });
    });
  });

  describe('propose_connector', () => {
    it('creates a connector_setup attachment for a known connector type', async () => {
      getConnectorSpecMock.mockReturnValue(githubSpec as never);

      const actionsStart = makeActionsStart([{ id: '.github', name: 'GitHub' }]);
      const tool = createProposeConnectorTool({ getActionsStart: async () => actionsStart });
      const { context, attachments } = createTestContext();

      const result = (await tool.handler(
        { connector_type: '.github', reason: 'Investigate issues' },
        context
      )) as ToolHandlerStandardReturn;

      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.other);
      const data = first.data as { attachment_id: string; version: number };
      expect(data.version).toBe(1);

      const stored = attachments.get(data.attachment_id);
      expect(stored?.type).toBe(CONNECTOR_SETUP_ATTACHMENT_TYPE);
      expect(stored?.data.data).toMatchObject({
        connector_type: '.github',
        connector_type_name: 'GitHub',
        reason: 'Investigate issues',
      });
    });

    it('creates a connector_setup attachment for a non-spec connector type', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const actionsStart = makeActionsStart([{ id: '.webhook', name: 'Webhook' }]);
      const tool = createProposeConnectorTool({ getActionsStart: async () => actionsStart });
      const { context, attachments } = createTestContext();

      const result = (await tool.handler(
        { connector_type: '.webhook' },
        context
      )) as ToolHandlerStandardReturn;

      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.other);

      const stored = attachments.get((first.data as { attachment_id: string }).attachment_id);
      expect(stored?.data.data).toMatchObject({
        connector_type: '.webhook',
        connector_type_name: 'Webhook',
      });
    });

    it('returns an error for a connector type not in the registry', async () => {
      const actionsStart = makeActionsStart([]);
      const tool = createProposeConnectorTool({ getActionsStart: async () => actionsStart });
      const { context, attachments } = createTestContext();

      const result = (await tool.handler(
        { connector_type: '.nope' },
        context
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(attachments.getActive()).toHaveLength(0);
    });

    it('rejects system action types', async () => {
      const actionsStart = makeActionsStart([
        { id: '.system', name: 'System', isSystemActionType: true },
      ]);
      const tool = createProposeConnectorTool({ getActionsStart: async () => actionsStart });
      const { context, attachments } = createTestContext();

      const result = (await tool.handler(
        { connector_type: '.system' },
        context
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(attachments.getActive()).toHaveLength(0);
    });

    it('rejects deprecated, config-disabled, and unlicensed connector types', async () => {
      const actionsStart = makeActionsStart([
        { id: '.deprecated', name: 'Deprecated', isDeprecated: true },
        { id: '.disabled', name: 'Disabled', enabledInConfig: false },
        { id: '.unlicensed', name: 'Unlicensed', enabledInLicense: false },
      ]);
      const tool = createProposeConnectorTool({ getActionsStart: async () => actionsStart });
      const { context, attachments } = createTestContext();

      for (const connectorType of ['.deprecated', '.disabled', '.unlicensed']) {
        const result = (await tool.handler(
          { connector_type: connectorType },
          context
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
      }
      expect(attachments.getActive()).toHaveLength(0);
    });
  });
});
