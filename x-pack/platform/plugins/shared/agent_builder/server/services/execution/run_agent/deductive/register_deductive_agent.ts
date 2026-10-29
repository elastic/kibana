/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID,
  AGENT_BUILDER_DEDUCTIVE_ENDPOINT_SETTING_ID,
  AGENT_BUILDER_DEDUCTIVE_API_KEY_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { AgentsServiceSetup } from '../../../agents';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from '../../../../types';
import { DEDUCTIVE_AGENT_ID, DEDUCTIVE_AVATAR_ICON } from './config';

/**
 * Global-scope Advanced Settings for the Deductive AI integration. Registered only when
 * the deployment opts in via `xpack.agentBuilder.deductive.register`, so customer
 * deployments never see or expose them.
 *
 * `deductiveEnabled` is the runtime kill switch; `deductiveEndpoint` / `deductiveApiKey`
 * are per-deployment configuration.
 */
const DEDUCTIVE_UI_SETTINGS: Record<string, UiSettingsParams> = {
  [AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID]: {
    description: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEnabled.description', {
      defaultMessage:
        'Enables routing the Deductive AI agent to the external Deductive backend for this deployment.',
    }),
    name: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEnabled.name', {
      defaultMessage: 'Elastic Agent Builder: Deductive AI Agent',
    }),
    schema: schema.boolean(),
    value: false,
    experimental: true,
    requiresPageReload: false,
  },
  [AGENT_BUILDER_DEDUCTIVE_ENDPOINT_SETTING_ID]: {
    description: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEndpoint.description', {
      defaultMessage:
        'Base URL of the Deductive backend to route the Deductive AI agent to (for example https://turing.deductive.ai or https://app.deductive.ai).',
    }),
    name: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEndpoint.name', {
      defaultMessage: 'Elastic Agent Builder: Deductive AI Endpoint',
    }),
    schema: schema.string(),
    value: 'https://turing.deductive.ai',
    experimental: true,
    requiresPageReload: false,
  },
  [AGENT_BUILDER_DEDUCTIVE_API_KEY_SETTING_ID]: {
    description: i18n.translate('xpack.agentBuilder.uiSettings.deductiveApiKey.description', {
      defaultMessage:
        'Bearer token for the Deductive backend. Use a dak_ API key generated on the target cluster. Warning: stored in plaintext in Advanced Settings; internal use only.',
    }),
    name: i18n.translate('xpack.agentBuilder.uiSettings.deductiveApiKey.name', {
      defaultMessage: 'Elastic Agent Builder: Deductive AI API Key',
    }),
    schema: schema.string(),
    value: '',
    sensitive: true,
    experimental: true,
    requiresPageReload: false,
  },
};

/**
 * Registers the external Deductive execution path with the plugin: the built-in
 * `deductive.ai` agent plus its Global Advanced Settings. Kept in the Deductive module so
 * the entire temporary integration can be removed by deleting this folder and its wiring.
 *
 * Registration is gated on the static `xpack.agentBuilder.deductive.register` config so
 * it only happens on deployments that explicitly opt in. The agent's availability and the
 * execution path are then gated on the `agentBuilder:deductiveEnabled` Global Advanced
 * Setting, which acts as the runtime kill switch.
 */
export const registerDeductiveAgent = ({
  coreSetup,
  uiSettings,
  agents,
  register,
}: {
  coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
  uiSettings: UiSettingsServiceSetup;
  agents: AgentsServiceSetup;
  register: boolean;
}) => {
  if (!register) {
    return;
  }

  uiSettings.registerGlobal(DEDUCTIVE_UI_SETTINGS);

  agents.register({
    id: DEDUCTIVE_AGENT_ID,
    name: 'Deductive AI Agent',
    description:
      'Routes execution to the external Deductive AI backend. Requires the Deductive AI ' +
      'Advanced Settings (endpoint + API key) on this deployment.',
    avatar_symbol: '',
    avatar_color: '#111113',
    avatar_icon: DEDUCTIVE_AVATAR_ICON,
    availability: {
      cacheMode: 'none',
      handler: async ({ request }) => {
        // Availability follows the GLOBAL (deployment-wide) `agentBuilder:deductiveEnabled`
        // setting, so the kill switch hides the agent from every user immediately.
        const [coreStart] = await coreSetup.getStartServices().catch(() => [undefined]);
        const globalClient = coreStart?.uiSettings?.globalAsScopedToClient(
          coreStart.savedObjects.getScopedClient(request)
        );
        const enabled = globalClient
          ? await globalClient
              .get<boolean>(AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID)
              .catch(() => false)
          : false;
        return enabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'Deductive AI agent is disabled' };
      },
    },
    configuration: {
      instructions: 'You are powered by Deductive AI.',
      tools: [],
      connector_ids: [],
      enable_elastic_capabilities: false,
    },
  });
};
