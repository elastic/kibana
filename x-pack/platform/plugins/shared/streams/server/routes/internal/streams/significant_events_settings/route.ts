/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelSettings } from '../../../../lib/saved_objects/significant_events/model_settings_config_service';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';

export const getSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Get significant events model settings',
    description:
      'Returns the current model settings (connector IDs) for knowledge indicator extraction, rule generation, and discovery.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }): Promise<ModelSettings> => {
    const { modelSettingsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    return modelSettingsClient.getSettings();
  },
});

const putSignificantEventsSettingsBodySchema = z.object({
  connectorIdKnowledgeIndicatorExtraction: z.string().optional(),
  connectorIdRuleGeneration: z.string().optional(),
  connectorIdDiscovery: z.string().optional(),
});

export const putSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Update significant events model settings',
    description:
      'Sets one or more model settings (connector IDs). Omitted fields are left unchanged. Use empty string to use the default connector for that setting.',
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
