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
import { IMPACT_UI_CAPABILITY_MANAGE, IMPACT_UI_CAPABILITY_SHOW } from '../common/impact/constants';
import {
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
} from '../common/escalations/constants';
import { IMPACT_API_PRIVILEGE_MANAGE, IMPACT_API_PRIVILEGE_READ } from './impact/constants';
import { registerImpactRoutes } from './impact/routes/register_routes';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from './escalations/constants';
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

  plugin.setup(
    coreSetup as never,
    {
      features,
      // agentBuilderPlatform is a required dep for ordering; it exposes no API used at setup time.
      agentBuilderPlatform: {},
    } as never
  );

  return { plugin, coreSetup, features };
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

    it('grants the impact capabilities from the top-level all privilege', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features);

      expect(privileges.all.api).toEqual([IMPACT_API_PRIVILEGE_READ, IMPACT_API_PRIVILEGE_MANAGE]);
      expect(privileges.all.ui).toEqual([IMPACT_UI_CAPABILITY_SHOW, IMPACT_UI_CAPABILITY_MANAGE]);
    });

    it('withholds manage from read, so a reader cannot attach impact', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features);

      expect(privileges.read.api).toEqual([IMPACT_API_PRIVILEGE_READ]);
      expect(privileges.read.ui).toEqual([IMPACT_UI_CAPABILITY_SHOW]);
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
