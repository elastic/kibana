/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ToolType } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { createConnectorLifecycleHandler } from './connector_lifecycle_handler';

const SIMPLE_WORKFLOW_YAML = `version: "1"
name: "sources.test.action"
description: "Test workflow"
tags: ["agent-builder-tool"]
enabled: true
triggers:
  - type: "manual"
inputs:
  - name: query
    type: string
steps:
  - name: do-action
    type: test.action
    connector-id: <%= test-stack-connector-id %>
    with:
      query: "\${{inputs.query}}"
`;

const WORKFLOW_YAML_NO_TOOL_TAG = `version: "1"
name: "sources.test.internal"
description: "Internal workflow"
tags: ["internal"]
enabled: true
triggers:
  - type: "manual"
steps:
  - name: do-internal
    type: test.internal
    connector-id: <%= test-stack-connector-id %>
`;

const createMockToolRegistry = () => ({
  create: jest.fn().mockResolvedValue({ id: 'mock-tool-id' }),
  list: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(undefined),
});

const createMockWorkflowsManagement = () => ({
  management: {
    createWorkflow: jest.fn().mockResolvedValue({ id: 'wf-123', name: 'test-workflow' }),
    deleteWorkflows: jest.fn().mockResolvedValue(undefined),
  },
});

const createMockUiSettingsClient = (experimentalFeaturesEnabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) return experimentalFeaturesEnabled;
    return undefined;
  }),
});

const createMockSmlService = () => ({
  indexAttachment: jest.fn().mockResolvedValue(undefined),
});

const createMockServiceManager = (
  toolRegistry = createMockToolRegistry(),
  uiSettingsClient = createMockUiSettingsClient(),
  sml = createMockSmlService()
) => ({
  internalStart: {
    tools: {
      getRegistry: jest.fn().mockResolvedValue(toolRegistry),
    },
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue({}),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
    },
    sml,
  },
});

const createMockGetStartServices = () =>
  jest.fn().mockResolvedValue([
    {
      elasticsearch: { client: { asInternalUser: {} } },
      savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) },
    },
    { spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('default') } } },
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
  workflowTemplates: [] as string[],
  ...overrides,
});

describe('createConnectorLifecycleHandler', () => {
  const logger = loggingSystemMock.create().get('connector-lifecycle');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onPostCreate', () => {
    it('skips unsuccessful saves', async () => {
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({
          wasSuccessful: false,
          workflowTemplates: [SIMPLE_WORKFLOW_YAML],
        }) as any
      );
    });

    it('skips connectors without workflows', async () => {
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(createBaseParams({ workflowTemplates: [] }) as any);

      expect(workflowsManagement.management.createWorkflow).not.toHaveBeenCalled();
    });

    it('skips when experimental features are disabled', async () => {
      const uiSettingsClient = createMockUiSettingsClient(false);
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(createMockToolRegistry(), uiSettingsClient) as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any
      );

      expect(workflowsManagement.management.createWorkflow).not.toHaveBeenCalled();
    });

    it('creates workflows and tools for connectors with workflow templates', async () => {
      const toolRegistry = createMockToolRegistry();
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(toolRegistry) as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any
      );

      expect(workflowsManagement.management.createWorkflow).toHaveBeenCalledTimes(1);
      const createCall = workflowsManagement.management.createWorkflow.mock.calls[0];
      expect(createCall[0].yaml).toContain('test.my-test-connector.action');
      expect(createCall[0].yaml).toContain('connector-abc');
      expect(createCall[1]).toBe('default');

      expect(toolRegistry.create).toHaveBeenCalledTimes(1);
      expect(toolRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ToolType.workflow,
          description: 'Test workflow',
          tags: ['connector', 'test', 'connector:connector-abc'],
          configuration: { workflow_id: 'wf-123' },
        })
      );
    });

    it('calls sml.indexAttachment with create action after tool creation', async () => {
      const sml = createMockSmlService();
      const serviceManager = createMockServiceManager(
        createMockToolRegistry(),
        createMockUiSettingsClient(),
        sml
      );
      const handler = createConnectorLifecycleHandler({
        serviceManager: serviceManager as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      const params = createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] });
      await handler.onPostCreate(params as any);

      expect(sml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'create',
        })
      );
    });

    it('logs warning but does not throw when sml.indexAttachment fails', async () => {
      const sml = createMockSmlService();
      sml.indexAttachment.mockRejectedValue(new Error('SML error'));
      const serviceManager = createMockServiceManager(
        createMockToolRegistry(),
        createMockUiSettingsClient(),
        sml
      );
      const handler = createConnectorLifecycleHandler({
        serviceManager: serviceManager as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(
        handler.onPostCreate(createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to index connector')
      );
    });

    it('substitutes template variables with connector ID', async () => {
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any
      );

      const yaml = workflowsManagement.management.createWorkflow.mock.calls[0][0].yaml;
      expect(yaml).toContain('connector-abc');
      expect(yaml).not.toContain('<%= test-stack-connector-id %>');
    });

    it('does not create a tool when workflow lacks agent-builder-tool tag', async () => {
      const toolRegistry = createMockToolRegistry();
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(toolRegistry) as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({ workflowTemplates: [WORKFLOW_YAML_NO_TOOL_TAG] }) as any
      );

      expect(workflowsManagement.management.createWorkflow).toHaveBeenCalledTimes(1);
      expect(toolRegistry.create).not.toHaveBeenCalled();
    });

    it('creates workflows in parallel for multiple templates', async () => {
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({
          workflowTemplates: [SIMPLE_WORKFLOW_YAML, WORKFLOW_YAML_NO_TOOL_TAG],
        }) as any
      );

      expect(workflowsManagement.management.createWorkflow).toHaveBeenCalledTimes(2);
    });

    it('logs error but does not throw when workflow creation fails', async () => {
      const workflowsManagement = createMockWorkflowsManagement();
      workflowsManagement.management.createWorkflow.mockRejectedValue(new Error('API error'));
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager() as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(
        handler.onPostCreate(createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any)
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to create workflows/tools')
      );
    });

    it('returns early when services are not started', async () => {
      const handler = createConnectorLifecycleHandler({
        serviceManager: { internalStart: undefined } as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostCreate(
        createBaseParams({ workflowTemplates: [SIMPLE_WORKFLOW_YAML] }) as any
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('services not started yet')
      );
    });
  });

  describe('onPostDelete', () => {
    it('deletes tools and workflows tagged with the connector ID', async () => {
      const toolRegistry = createMockToolRegistry();
      toolRegistry.list.mockResolvedValue([
        {
          id: 'tool-1',
          tags: ['connector', 'test', 'connector:connector-abc'],
          configuration: { workflow_id: 'wf-1' },
        },
        {
          id: 'tool-2',
          tags: ['connector', 'test', 'connector:connector-abc'],
          configuration: { workflow_id: 'wf-2' },
        },
      ]);
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(toolRegistry) as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any);

      expect(toolRegistry.list).toHaveBeenCalledWith({ tags: ['connector:connector-abc'] });
      expect(toolRegistry.delete).toHaveBeenCalledTimes(2);
      expect(toolRegistry.delete).toHaveBeenCalledWith('tool-1');
      expect(toolRegistry.delete).toHaveBeenCalledWith('tool-2');

      expect(workflowsManagement.management.deleteWorkflows).toHaveBeenCalledWith(
        ['wf-1', 'wf-2'],
        'default',
        expect.anything()
      );
    });

    it('handles connectors with no associated tools', async () => {
      const toolRegistry = createMockToolRegistry();
      toolRegistry.list.mockResolvedValue([]);
      const workflowsManagement = createMockWorkflowsManagement();
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(toolRegistry) as any,
        workflowsManagement: workflowsManagement as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await handler.onPostDelete(createBaseParams() as any);

      expect(toolRegistry.delete).not.toHaveBeenCalled();
      expect(workflowsManagement.management.deleteWorkflows).not.toHaveBeenCalled();
    });

    it('calls sml.indexAttachment with delete action after cleanup', async () => {
      const sml = createMockSmlService();
      const toolRegistry = createMockToolRegistry();
      toolRegistry.list.mockResolvedValue([]);
      const serviceManager = createMockServiceManager(
        toolRegistry,
        createMockUiSettingsClient(),
        sml
      );
      const handler = createConnectorLifecycleHandler({
        serviceManager: serviceManager as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      const params = createBaseParams({ connectorType: '.test' });
      await handler.onPostDelete(params as any);

      expect(sml.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'connector-abc',
          attachmentType: AttachmentType.connector,
          action: 'delete',
        })
      );
    });

    it('logs warning but does not throw when SML delete fails', async () => {
      const sml = createMockSmlService();
      sml.indexAttachment.mockRejectedValue(new Error('SML delete error'));
      const toolRegistry = createMockToolRegistry();
      toolRegistry.list.mockResolvedValue([]);
      const serviceManager = createMockServiceManager(
        toolRegistry,
        createMockUiSettingsClient(),
        sml
      );
      const handler = createConnectorLifecycleHandler({
        serviceManager: serviceManager as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(
        handler.onPostDelete(createBaseParams({ connectorType: '.test' }) as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to remove connector')
      );
    });

    it('logs error but does not throw on failure', async () => {
      const toolRegistry = createMockToolRegistry();
      toolRegistry.list.mockRejectedValue(new Error('list failed'));
      const handler = createConnectorLifecycleHandler({
        serviceManager: createMockServiceManager(toolRegistry) as any,
        workflowsManagement: createMockWorkflowsManagement() as any,
        logger,
        getStartServices: createMockGetStartServices(),
      });

      await expect(handler.onPostDelete(createBaseParams() as any)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed to clean up'));
    });
  });
});
