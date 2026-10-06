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
import { IMPACT_ATTACHMENT_TYPE } from '../common/impact/attachment';
import { SET_IMPACT_TOOL_ID } from '../common/impact/constants';
import { AttachImpactStepId, GetImpactStepId } from '../common/impact/step_types';
import { ReopenInvestigationStepId } from '../common/investigations/step_types';
import { registerImpactRoutes } from './impact/routes/register_routes';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from './escalations/constants';
import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from './investigations/constants';
import { registerEscalationRoutes } from './escalations/routes/register_routes';
import { registerInvestigationRoutes } from './investigations/routes/register_routes';
import { AgenticInvestigationsPlugin } from './plugin';

jest.mock('./impact/routes/register_routes', () => ({
  registerImpactRoutes: jest.fn(),
}));

jest.mock('./escalations/routes/register_routes', () => ({
  registerEscalationRoutes: jest.fn(),
}));

jest.mock('./investigations/routes/register_routes', () => ({
  registerInvestigationRoutes: jest.fn(),
}));

const createContext = ({ escalationsEnabled = true }: { escalationsEnabled?: boolean } = {}) =>
  ({
    logger: { get: () => loggerMock.create() },
    config: {
      get: () => ({ enabled: true, escalations: { enabled: escalationsEnabled } }),
    },
  } as unknown as ConstructorParameters<typeof AgenticInvestigationsPlugin>[0]);

const setupPlugin = ({ escalationsEnabled }: { escalationsEnabled?: boolean } = {}) => {
  const plugin = new AgenticInvestigationsPlugin(createContext({ escalationsEnabled }));
  const coreSetup = coreMock.createSetup();
  const features = { registerKibanaFeature: jest.fn() };

  const workflowsExtensions = { registerStepDefinition: jest.fn() };
  const agentBuilder = {
    attachments: { registerType: jest.fn() },
    tools: { register: jest.fn() },
  };

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
        addAccessControlEntries: jest.fn(),
        removeAccessControlEntries: jest.fn(),
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

const registeredFeature = (features: { registerKibanaFeature: jest.Mock }, id: string) =>
  features.registerKibanaFeature.mock.calls.find(([f]: [{ id: string }]) => f.id === id)[0];

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

    it('grants the investigations read API privilege with both base privileges', () => {
      const { features } = setupPlugin();
      const { privileges } = registeredFeature(features, AGENTIC_INVESTIGATIONS_PLUGIN_ID);

      expect(INVESTIGATIONS_API_PRIVILEGE_READ).toBe('read_investigations');
      expect(privileges.all.api).toEqual([INVESTIGATIONS_API_PRIVILEGE_READ]);
      expect(privileges.all.ui).toEqual([]);
      expect(privileges.read.api).toEqual([INVESTIGATIONS_API_PRIVILEGE_READ]);
      expect(privileges.read.ui).toEqual([]);
    });

    it('keeps investigations in a sub-feature with a manage privilege', () => {
      const { features } = setupPlugin();
      const { subFeatures } = registeredFeature(features, AGENTIC_INVESTIGATIONS_PLUGIN_ID);
      const [investigationsAll] = subFeatures[0].privilegeGroups[0].privileges;

      expect(investigationsAll).toEqual(
        expect.objectContaining({
          id: 'investigations_all',
          includeIn: 'all',
          api: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
        })
      );
    });

    it('registers escalations as a sub-feature alongside investigations with all/read privileges', () => {
      const { features } = setupPlugin();
      const { subFeatures } = registeredFeature(features, AGENTIC_INVESTIGATIONS_PLUGIN_ID);
      const [escalationsAll, escalationsRead] = subFeatures[1].privilegeGroups[0].privileges;

      expect(escalationsAll).toEqual(
        expect.objectContaining({
          id: 'escalations_all',
          includeIn: 'none',
          api: [ESCALATIONS_API_PRIVILEGE_READ, ESCALATIONS_API_PRIVILEGE_MANAGE],
          ui: [ESCALATIONS_UI_CAPABILITY_SHOW, ESCALATIONS_UI_CAPABILITY_MANAGE],
        })
      );
      expect(escalationsRead).toEqual(
        expect.objectContaining({
          id: 'escalations_read',
          includeIn: 'read',
          api: [ESCALATIONS_API_PRIVILEGE_READ],
          ui: [ESCALATIONS_UI_CAPABILITY_SHOW],
        })
      );
    });

    it('registers no escalations sub-feature when escalations are disabled', () => {
      const { features } = setupPlugin({ escalationsEnabled: false });
      const feature = registeredFeature(features, AGENTIC_INVESTIGATIONS_PLUGIN_ID);

      expect(feature.subFeatures).toHaveLength(1);
      expect(feature.subFeatures[0].privilegeGroups[0].privileges[0].id).toBe('investigations_all');
      expect(JSON.stringify(feature)).not.toMatch(/escalations/i);
    });

    it('tells the escalation routes whether escalations are enabled', () => {
      setupPlugin({ escalationsEnabled: false });

      expect(registerEscalationRoutes).toHaveBeenCalledWith(
        expect.objectContaining({ escalationsEnabled: false })
      );
    });

    it('registers the impact attachment type and workflow steps during setup', () => {
      const { workflowsExtensions, agentBuilder } = setupPlugin();

      expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(1);
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ id: IMPACT_ATTACHMENT_TYPE, isReadonly: true })
      );

      const registeredIds = workflowsExtensions.registerStepDefinition.mock.calls.map(
        ([definition]) => definition.id
      );
      expect(registeredIds).toEqual([
        AttachImpactStepId,
        GetImpactStepId,
        ReopenInvestigationStepId,
      ]);
    });

    it('registers the set_impact agent tool during setup', () => {
      const { agentBuilder } = setupPlugin();

      expect(agentBuilder.tools.register).toHaveBeenCalledTimes(1);
      expect(agentBuilder.tools.register).toHaveBeenCalledWith(
        expect.objectContaining({ id: SET_IMPACT_TOOL_ID })
      );
    });

    it('does not resolve the authorization service until a step actually runs', () => {
      const { coreSetup } = setupPlugin();

      // Steps register during setup, when `security.authz` does not exist yet.
      expect(coreSetup.getStartServices).not.toHaveBeenCalled();
    });

    it('grants no proposals privilege, which the proposals feature owns instead', () => {
      const { features } = setupPlugin();

      expect(
        JSON.stringify(registeredFeature(features, AGENTIC_INVESTIGATIONS_PLUGIN_ID))
      ).not.toMatch(/proposals/i);
    });

    it('registers the HTTP routes for every entity', () => {
      setupPlugin();

      expect(registerImpactRoutes).toHaveBeenCalledTimes(1);
      expect(registerEscalationRoutes).toHaveBeenCalledTimes(1);
      expect(registerInvestigationRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe('start', () => {
    it('exposes a request-scoped impact client and escalations for in-process callers', () => {
      const { plugin } = setupPlugin();

      const { contract } = startPlugin(plugin);

      expect(contract.getImpactClient).toEqual(expect.any(Function));
      expect(contract.getEscalationsService()).toBeDefined();
    });

    it('refuses the escalations service when escalations are disabled', () => {
      const { plugin } = setupPlugin({ escalationsEnabled: false });

      const { contract } = startPlugin(plugin);

      expect(() => contract.getEscalationsService()).toThrow(/escalations are disabled/i);
    });

    it('exposes no proposals getter, which the proposals plugin owns instead', () => {
      const { plugin } = setupPlugin();

      const { contract } = startPlugin(plugin);

      expect(contract).not.toHaveProperty('getProposalsService');
      expect(contract).not.toHaveProperty('getProposalPrivileges');
    });
  });
});
