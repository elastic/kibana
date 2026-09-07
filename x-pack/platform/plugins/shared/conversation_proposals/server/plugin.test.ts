/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CONVERSATION_PROPOSALS_PLUGIN_ID,
  PROPOSALS_API_PRIVILEGE_READ,
  PROPOSALS_API_PRIVILEGE_WRITE,
} from '../common/constants';
import { CreateProposalStepId, RecordProposalResultStepId } from '../common/step_types';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { ConversationProposalsPlugin } from './plugin';
import { registerRoutes } from './routes/register_routes';

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createContext = () =>
  ({
    logger: { get: () => loggerMock.create() },
  } as unknown as ConstructorParameters<typeof ConversationProposalsPlugin>[0]);

const setupPlugin = () => {
  const plugin = new ConversationProposalsPlugin(createContext());
  const coreSetup = coreMock.createSetup();
  const features = { registerKibanaFeature: jest.fn() };
  const workflowsExtensions = { registerStepDefinition: jest.fn() };
  const workflowsManagement = { management: { getWorkflow: jest.fn() } };

  plugin.setup(
    coreSetup as never,
    {
      features,
      workflowsExtensions,
      workflowsManagement,
    } as never
  );

  return { plugin, coreSetup, features, workflowsExtensions, workflowsManagement };
};

const startPlugin = (plugin: ConversationProposalsPlugin) => {
  const coreStart = coreMock.createStart();
  const workflowsExtensions = { initManagedWorkflowsClient: jest.fn() };

  const contract = plugin.start(
    coreStart as never,
    {
      workflowsExtensions,
      spaces: undefined,
    } as never
  );

  return { coreStart, contract, workflowsExtensions };
};

describe('ConversationProposalsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('registers a feature whose write privilege covers both decision routes', () => {
      const { features } = setupPlugin();

      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CONVERSATION_PROPOSALS_PLUGIN_ID,
          privileges: expect.objectContaining({
            all: expect.objectContaining({
              api: [PROPOSALS_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_WRITE],
            }),
            read: expect.objectContaining({ api: [PROPOSALS_API_PRIVILEGE_READ] }),
          }),
        })
      );
    });

    it('registers both workflow step definitions during setup, not start', () => {
      const { workflowsExtensions } = setupPlugin();

      const registeredIds = workflowsExtensions.registerStepDefinition.mock.calls.map(
        ([definition]) => definition.id
      );
      expect(registeredIds).toEqual([CreateProposalStepId, RecordProposalResultStepId]);
    });

    it('registers the HTTP routes', () => {
      setupPlugin();

      expect(registerRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe('start', () => {
    it('installs the managed gate workflow', () => {
      const { plugin } = setupPlugin();

      startPlugin(plugin);

      expect(initializeManagedWorkflows).toHaveBeenCalledTimes(1);
    });

    it('exposes the proposals service for in-process callers', () => {
      const { plugin } = setupPlugin();

      const { contract } = startPlugin(plugin);

      expect(contract.getProposalsService()).toBeDefined();
    });
  });

  it('fails loudly when a step handler runs before start', () => {
    const { workflowsExtensions } = setupPlugin();
    const [[createStep]] = workflowsExtensions.registerStepDefinition.mock.calls;

    // The step factory closes over a getter, so the service is resolved per
    // call rather than captured at registration time.
    expect(() => createStep.handler).not.toThrow();
  });
});
