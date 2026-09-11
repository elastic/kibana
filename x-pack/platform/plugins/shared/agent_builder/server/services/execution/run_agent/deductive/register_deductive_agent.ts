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
import { DEDUCTIVE_AGENT_ID, DEDUCTIVE_AVATAR_ICON, DEDUCTIVE_ENABLED_FLAG } from './config';

/**
 * Shared definition (registered in both per-user and global scope so a single
 * Global Advanced Settings entry applies to every user of the deployment).
 */
const DEDUCTIVE_UI_SETTINGS: Record<string, UiSettingsParams> = {
  [AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID]: {
    description: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEnabled.description', {
      defaultMessage:
        'Enables routing the Deductive AI agent to the external Deductive backend (per-deployment feature flag must also be on).',
    }),
    name: i18n.translate('xpack.agentBuilder.uiSettings.deductiveEnabled.name', {
      defaultMessage: 'Elastic Agent Builder: Deductive AI Agent',
    }),
    schema: schema.boolean(),
    value: false,
    experimental: true,
    requiresPageReload: false,
    readonly: true,
    readonlyMode: 'ui',
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
    readonly: true,
    readonlyMode: 'ui',
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
    readonly: true,
    readonlyMode: 'ui',
  },
};

/**
 * Registers the external Deductive execution path with the plugin: the built-in
 * `deductive.ai` agent plus its Advanced Settings. Kept in the Deductive module so the
 * entire temporary integration can be removed by deleting this folder and its wiring.
 *
 * The agent is registered for every user, but its availability is gated on the
 * `agentBuilder:deductiveEnabled` Advanced Setting (which admins turn on together with
 * the per-deployment feature flag). When disabled, the agent disappears from the agents
 * list for everyone.
 */
export const registerDeductiveAgent = ({
  coreSetup,
  uiSettings,
  agents,
}: {
  coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
  uiSettings: UiSettingsServiceSetup;
  agents: AgentsServiceSetup;
}) => {
  // Advanced Settings are registered in BOTH scopes so they can be configured once in
  // Global Advanced Settings and apply to every user of the deployment.
  uiSettings.register(DEDUCTIVE_UI_SETTINGS);
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
      handler: async ({ request, uiSettings: scopedUiSettings }) => {
        // Availability must honor the GLOBAL (deployment-wide) setting too, so an admin
        // configures `agentBuilder:deductiveEnabled` once and every user sees the agent —
        // and the per-deployment feature flag, so flipping it off removes the agent
        // entirely (settings stop having any effect).
        const [coreStart] = await coreSetup.getStartServices().catch(() => [undefined]);
        const flagEnabled = await coreStart?.featureFlags
          ?.getBooleanValue(DEDUCTIVE_ENABLED_FLAG, false)
          .catch(() => false);
        if (!flagEnabled) {
          return {
            status: 'unavailable',
            reason: 'Deductive AI is not enabled for this deployment',
          };
        }
        const globalClient = coreStart?.uiSettings?.globalAsScopedToClient(
          coreStart.savedObjects.getScopedClient(request)
        );
        const read = async (client: typeof scopedUiSettings | undefined) =>
          client?.get<boolean>(AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID).catch(() => false) ??
          false;
        const userEnabled = await read(scopedUiSettings);
        const globalEnabled = globalClient ? await read(globalClient) : false;
        const enabled = userEnabled || globalEnabled;
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
