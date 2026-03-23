/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelSettings } from '../../../../lib/saved_objects/significant_events/model_settings_config_service';
import { getConfiguredIndexPatterns } from '../../../../lib/significant_events/helpers/get_configured_index_patterns';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';

export type SignificantEventsSettingsResponse = ModelSettings & {
  /** Resolved index patterns (with server default applied). Use this for filtering; do not duplicate default on the client. */
  indexPatternsResolved: string[];
};

export const getSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Get settings for Significant Events',
    description: 'Returns the settings defined by the user for the Significant Events feature.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventsSettingsResponse> => {
    const { modelSettingsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    const settings = await modelSettingsClient.getSettings();
    const indexPatternsResolved = await getConfiguredIndexPatterns(settings);
    return { ...settings, indexPatternsResolved };
  },
});

const putSignificantEventsSettingsBodySchema = z.object({
  connectorIdKnowledgeIndicatorExtraction: z.string().optional(),
  connectorIdRuleGeneration: z.string().optional(),
  connectorIdDiscovery: z.string().optional(),
  indexPatterns: z.string().optional(),
});

export const putSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Update significant events settings',
    description:
      'Sets one or more significant events settings. Omitted fields are left unchanged. Currently supports model settings (connector IDs): use empty string to use the default connector for that setting. Additional settings may be supported in the future.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: putSignificantEventsSettingsBodySchema,
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ success: true }> => {
    const { modelSettingsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await modelSettingsClient.updateSettings(params.body);
    return { success: true };
  },
});

export const internalSignificantEventsSettingsRoutes = {
  ...getSignificantEventsSettingsRoute,
  ...putSignificantEventsSettingsRoute,
};
