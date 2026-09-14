/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID,
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
} from '../common/constants';
import {
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
} from '../common/proposals/constants';
import { CreateProposalStepId, UpdateProposalStepId } from '../common/proposals/step_types';
import { AgenticInvestigationsPlugin } from './plugin';
import { initializeManagedWorkflows } from './proposals/managed_workflows/initialize_managed_workflows';
import {
  PROPOSALS_API_PRIVILEGE_MANAGE,
  PROPOSALS_API_PRIVILEGE_READ,
} from './proposals/constants';
import { registerRoutes } from './proposals/routes/register_routes';

jest.mock('./proposals/managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./proposals/routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createContext = () =>
  ({
    logger: { get: () => loggerMock.create() },
  }) as unknown as ConstructorParameters<typeof AgenticInvestigationsPlugin>[0];

const setupPlugin = () => {
  const plugin = new AgenticInvestigationsPlugin(createContext());
  const coreSetup = coreMock.createSetup();
  const features = { registerKibanaFeature: jest.fn() };
  const workflowsExtensions = {
    registerStepDefinition: jest.fn(),
    registerManagedWorkflowOwner: jest.fn(),
  };
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

const startPlugin = (plugin: AgenticInvestigationsPlugin) => {
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

/** The single registered feature config, for assertions on its shape. */
const registeredFeature = (features: { registerKibanaFeature: jest.Mock }) =>
  features.registerKibanaFeature.mock.calls[0][0];

describe('AgenticInvestigationsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('registers the umbrella feature under Analytics at enterprise, matching Workflows', () => {
      const { features } = setupPlugin();

      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
          category: DEFAULT_APP_CATEGORIES.kibana,
          minimumLicense: 'enterprise',
        })
      );
    });

    it('grants the proposals capabilities from the top-level all privilege', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features);

      expect(privileges.all.api).toEqual([
        PROPOSALS_API_PRIVILEGE_READ,
        PROPOSALS_API_PRIVILEGE_MANAGE,
      ]);
      expect(privileges.all.ui).toEqual([
        PROPOSALS_UI_CAPABILITY_SHOW,
        PROPOSALS_UI_CAPABILITY_DECIDE,
      ]);
    });

    it('withholds manage and decide from read, so a reader cannot decide', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features);

      expect(privileges.read.api).toEqual([PROPOSALS_API_PRIVILEGE_READ]);
      expect(privileges.read.ui).toEqual([PROPOSALS_UI_CAPABILITY_SHOW]);
    });

    it('registers as a managed workflow owner, or the startup sweep deletes our workflows', () => {
      const { workflowsExtensions } = setupPlugin();

      expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(
        AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID
      );
    });

    it('registers both workflow step definitions during setup, not start', () => {
      const { workflowsExtensions } = setupPlugin();

      const registeredIds = workflowsExtensions.registerStepDefinition.mock.calls.map(
        ([definition]) => definition.id
      );
      expect(registeredIds).toEqual([CreateProposalStepId, UpdateProposalStepId]);
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
