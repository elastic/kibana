/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENTIC_INVESTIGATIONS_PLUGIN_ID } from '../common/constants';
import {
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
} from '../common/escalations/constants';
import { AttachImpactStepId, GetImpactStepId } from '../common/impact/step_types';
import { registerImpactRoutes } from './impact/routes/register_routes';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from './escalations/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from './investigations/constants';
import { registerEscalationRoutes } from './escalations/routes/register_routes';
import { AgenticInvestigationsPlugin } from './plugin';

jest.mock('./impact/routes/register_routes', () => ({
  registerImpactRoutes: jest.fn(),
}));

jest.mock('./escalations/routes/register_routes', () => ({
  registerEscalationRoutes: jest.fn(),
}));

const createContext = () =>
  ({
    logger: { get: () => loggerMock.create() },
  } as unknown as ConstructorParameters<typeof AgenticInvestigationsPlugin>[0]);

const setupPlugin = () => {
  const plugin = new AgenticInvestigationsPlugin(createContext());
  const coreSetup = coreMock.createSetup();
  const features = { registerKibanaFeature: jest.fn() };

  const workflowsExtensions = { registerStepDefinition: jest.fn() };
  const agentBuilder = { attachments: { registerType: jest.fn() } };

  plugin.setup(
    coreSetup as never,
    {
      features,
      // agentBuilderPlatform is a required dep for ordering; it exposes no API used at setup time.
      agentBuilderPlatform: {},
      agentBuilder,
      workflowsExtensions,
    } as never
  );

  return { plugin, coreSetup, features, agentBuilder, workflowsExtensions };
};

const startPlugin = (plugin: AgenticInvestigationsPlugin) => {
  const coreStart = coreMock.createStart();
  const agentBuilder = {
    conversations: {
      getScopedClient: jest.fn().mockReturnValue({
        get: jest.fn(),
        bulkGet: jest.fn(),
        list: jest.fn(),
        search: jest.fn(),
        create: jest.fn(),
        patchMetadata: jest.fn(),
        update: jest.fn(),
      }),
    },
    conversationTemplates: {
      get: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    },
  };

  const contract = plugin.start(
    coreStart as never,
    {
      agentBuilder,
      spaces: undefined,
      security: undefined,
    } as never
  );

  return { coreStart, contract, agentBuilder };
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

    it('leaves impact off the base privileges until it needs its own', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features);

      expect(privileges.all.api).toEqual([]);
      expect(privileges.all.ui).toEqual([]);
      expect(privileges.read.api).toEqual([]);
      expect(privileges.read.ui).toEqual([]);
    });

    it('keeps escalations in a sub-feature, joined to the base levels by includeIn', () => {
      const { features } = setupPlugin();
      const { subFeatures } = registeredFeature(features);
      const [escalationsAll, escalationsRead] = subFeatures[0].privilegeGroups[0].privileges;

      expect(escalationsAll).toEqual(
        expect.objectContaining({
          includeIn: 'all',
          api: [ESCALATIONS_API_PRIVILEGE_READ, ESCALATIONS_API_PRIVILEGE_MANAGE],
          ui: [ESCALATIONS_UI_CAPABILITY_SHOW, ESCALATIONS_UI_CAPABILITY_MANAGE],
        })
      );
      expect(escalationsRead).toEqual(
        expect.objectContaining({
          includeIn: 'read',
          api: [ESCALATIONS_API_PRIVILEGE_READ],
          ui: [ESCALATIONS_UI_CAPABILITY_SHOW],
        })
      );
    });

    it('keeps investigations in a sub-feature with a manage privilege', () => {
      const { features } = setupPlugin();
      const { subFeatures } = registeredFeature(features);
      const [investigationsAll] = subFeatures[1].privilegeGroups[0].privileges;

      expect(investigationsAll).toEqual(
        expect.objectContaining({
          id: 'investigations_all',
          includeIn: 'all',
          api: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
        })
      );
    });

    it('registers the impact attachment type and workflow steps during setup', () => {
      const { workflowsExtensions, agentBuilder } = setupPlugin();

      expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(1);

      const registeredIds = workflowsExtensions.registerStepDefinition.mock.calls.map(
        ([definition]) => definition.id
      );
      expect(registeredIds).toEqual([AttachImpactStepId, GetImpactStepId]);
    });

    it('does not resolve the authorization service until a step actually runs', () => {
      const { coreSetup } = setupPlugin();

      // Steps register during setup, when `security.authz` does not exist yet.
      expect(coreSetup.getStartServices).not.toHaveBeenCalled();
    });

    it('grants no proposals privilege, which the proposals feature owns instead', () => {
      const { features } = setupPlugin();

      expect(JSON.stringify(registeredFeature(features))).not.toMatch(/proposals/i);
    });

    it('registers the HTTP routes for every entity', () => {
      setupPlugin();

      expect(registerImpactRoutes).toHaveBeenCalledTimes(1);
      expect(registerEscalationRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe('start', () => {
    it('exposes a request-scoped impact client and escalations for in-process callers', () => {
      const { plugin } = setupPlugin();

      const { contract } = startPlugin(plugin);

      expect(contract.getImpactClient).toEqual(expect.any(Function));
      expect(contract.getEscalationsService()).toBeDefined();
    });

    it('exposes no proposals getter, which the proposals plugin owns instead', () => {
      const { plugin } = setupPlugin();

      const { contract } = startPlugin(plugin);

      expect(contract).not.toHaveProperty('getProposalsService');
      expect(contract).not.toHaveProperty('getProposalPrivileges');
    });
  });
});
