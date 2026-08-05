/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getConnectorSpec } from '@kbn/connector-specs';
import { createConnectorLifecycleHandler } from './connector_lifecycle_handler';

jest.mock('@kbn/connector-specs', () => ({
  connectorsSpecs: {},
  getConnectorSpec: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

const createMockUiSettingsClient = (experimentalEnabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) return experimentalEnabled;
    return undefined;
  }),
});

const createMockAgentBuilderSml = () => ({
  indexAttachment: jest.fn().mockResolvedValue(undefined),
  deleteAttachment: jest.fn().mockResolvedValue(undefined),
});

const createMockSkillRegistry = () => ({
  has: jest.fn().mockResolvedValue(false),
  get: jest.fn().mockResolvedValue(undefined),
  bulkGet: jest.fn().mockResolvedValue(new Map()),
  list: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue(true),
});

const createMockAgentBuilder = (skillRegistry = createMockSkillRegistry()) => ({
  skills: {
    getRegistry: jest.fn().mockResolvedValue(skillRegistry),
  },
});

const createMockGetStartServices = (
  uiSettingsClient = createMockUiSettingsClient(),
  agentBuilderSml = createMockAgentBuilderSml(),
  agentBuilder = createMockAgentBuilder()
) =>
  jest.fn().mockResolvedValue([
    {
      elasticsearch: { client: { asInternalUser: {} } },
      savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) },
      uiSettings: { asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient) },
    },
    {
      spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('default') } },
      agentBuilderSml,
      agentBuilder,
    },
    {},
  ]);

const createBaseParams = (overrides = {}) => ({
  connectorId: 'connector-abc',
  connectorName: 'My Test Connector',
  connectorType: '.test',
  config: {},
  secrets: {},
  logger: loggingSystemMock.create().get(),
  request: {} as any,
  services: { scopedClusterClient: {} as any },
  wasSuccessful: true,
  ...overrides,
});

describe('createConnectorLifecycleHandler', () => {
  const logger = loggingSystemMock.create().get('connector-lifecycle');

  beforeEach(() => {
    jest.clearAllMocks();
    getConnectorSpecMock.mockReturnValue({
      metadata: { id: '.test', displayName: 'Test', description: '', minimumLicense: 'basic' },
      actions: {},
    } as never);
  });

  describe('onPostCreate', () => {
    it('skips unsuccessful saves', async () => {
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await handler.onPostCreate(createBaseParams({ wasSuccessful: false }) as any);

      expect(agentBuilderSml.indexAttachment).not.toHaveBeenCalled();
    });

    it('skips connector types with no way to be called from chat (no spec, not MCP)', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await handler.onPostCreate(createBaseParams({ connectorType: '.jira' }) as any);

      expect(agentBuilderSml.indexAttachment).not.toHaveBeenCalled();
    });

    it('indexes the MCP connector even though it has no connector-specs entry', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await handler.onPostCreate(createBaseParams({ connectorType: '.mcp' }) as any);

      expect(agentBuilderSml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'connector-abc', action: 'create' })
      );
    });

    it('skips when Agent Builder experimental features are disabled', async () => {
      const uiSettingsClient = createMockUiSettingsClient(false);
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(uiSettingsClient, agentBuilderSml),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(agentBuilderSml.indexAttachment).not.toHaveBeenCalled();
    });

    it('indexes connector into SML', async () => {
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(agentBuilderSml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'create',
        })
      );
    });

    it('logs warning but does not throw when indexAttachment fails', async () => {
      const agentBuilderSml = createMockAgentBuilderSml();
      agentBuilderSml.indexAttachment.mockRejectedValue(new Error('SML error'));
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await expect(handler.onPostCreate(createBaseParams() as any)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to index connector')
      );
    });

    it('installs skills keyed by connector type (not instance), content passed through as-is', async () => {
      const skillRegistry = createMockSkillRegistry();
      const agentBuilder = createMockAgentBuilder(skillRegistry);
      getConnectorSpecMock.mockReturnValue({
        metadata: { id: '.test', displayName: 'Test', description: '', minimumLicense: 'basic' },
        actions: {},
        skillFiles: [
          {
            id: 'my-skill',
            name: 'test-skill',
            description: 'Does something useful',
            content: 'Use --connectorId <connectorId> to do things.',
            resources: [
              {
                name: 'example',
                relativePath: './resources',
                content: '--connectorId <connectorId>',
              },
            ],
          },
        ],
      } as never);

      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(
          createMockUiSettingsClient(),
          createMockAgentBuilderSml(),
          agentBuilder
        ),
      });

      await handler.onPostCreate(createBaseParams() as any);

      expect(skillRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-skill',
          name: 'test-skill',
          content: 'Use --connectorId <connectorId> to do things.',
          referenced_content: [
            expect.objectContaining({
              name: 'example',
              content: '--connectorId <connectorId>',
            }),
          ],
        })
      );
    });

    it('logs debug (not warn) and does not throw when skill create fails — expected for second connector of same type', async () => {
      const skillRegistry = createMockSkillRegistry();
      skillRegistry.create.mockRejectedValue(new Error('already exists'));
      const agentBuilder = createMockAgentBuilder(skillRegistry);
      getConnectorSpecMock.mockReturnValue({
        metadata: { id: '.test', displayName: 'Test', description: '', minimumLicense: 'basic' },
        actions: {},
        skillFiles: [
          { id: 'my-skill', name: 'test-skill', description: 'desc', content: 'content' },
        ],
      } as never);

      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(
          createMockUiSettingsClient(),
          createMockAgentBuilderSml(),
          agentBuilder
        ),
      });

      await expect(handler.onPostCreate(createBaseParams() as any)).resolves.toBeUndefined();

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('skill'));
    });
  });

  describe('onPostDelete', () => {
    it('removes connector from SML', async () => {
      const agentBuilderSml = createMockAgentBuilderSml();
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any);

      expect(agentBuilderSml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'delete',
        })
      );
    });

    it('logs warning but does not throw when SML delete fails', async () => {
      const agentBuilderSml = createMockAgentBuilderSml();
      agentBuilderSml.indexAttachment.mockRejectedValue(new Error('SML delete error'));
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(createMockUiSettingsClient(), agentBuilderSml),
      });

      await expect(
        handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to remove connector')
      );
    });

    it('logs error when getStartServices fails', async () => {
      const getStartServices = jest.fn().mockRejectedValue(new Error('start services failed'));
      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices,
      });

      await expect(
        handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any)
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to clean up for connector')
      );
    });

    it('does not delete skills on connector delete — per-type skills are shared across instances', async () => {
      const skillRegistry = createMockSkillRegistry();
      const agentBuilder = createMockAgentBuilder(skillRegistry);
      getConnectorSpecMock.mockReturnValue({
        metadata: { id: '.test', displayName: 'Test', description: '', minimumLicense: 'basic' },
        actions: {},
        skillFiles: [
          { id: 'skill-a', name: 'test-skill-a', description: 'desc', content: 'content' },
        ],
      } as never);

      const handler = createConnectorLifecycleHandler({
        logger,
        getStartServices: createMockGetStartServices(
          createMockUiSettingsClient(),
          createMockAgentBuilderSml(),
          agentBuilder
        ),
      });

      await handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any);

      expect(skillRegistry.delete).not.toHaveBeenCalled();
    });
  });
});
