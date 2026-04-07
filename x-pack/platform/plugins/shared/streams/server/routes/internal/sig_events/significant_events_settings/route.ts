/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
} from '@kbn/management-settings-ids';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import {
  STREAMS_API_PRIVILEGES,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '../../../../../common/constants';

const putSignificantEventsSettingsBodySchema = z.object({
  continuousKiExtraction: z.object({
    enabled: z.boolean().optional(),
    intervalHours: z.number().min(MIN_EXTRACTION_INTERVAL_HOURS).optional(),
    excludedStreamPatterns: z.string().optional(),
  }),
});

export const putSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Update continuous KI extraction settings',
    description:
      'Updates continuous KI extraction settings (enabled, interval, excluded patterns) and ensures the extraction workflow is created or updated accordingly.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: putSignificantEventsSettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    continuousKiExtractionWorkflowService,
  }): Promise<{ success: true }> => {
    const { licensing, uiSettingsClient, globalUiSettingsClient, taskClient } =
      await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { continuousKiExtraction } = params.body;

    if (continuousKiExtractionWorkflowService) {
      const enabled =
        continuousKiExtraction.enabled ??
        (await globalUiSettingsClient.get<boolean>(
          OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
        ));
      await continuousKiExtractionWorkflowService.ensureWorkflow({
        enabled,
        request,
        taskClient,
      });
    }

    const updates: Record<string, boolean | number | string> = {};

    if (continuousKiExtraction.enabled !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] =
        continuousKiExtraction.enabled;
    }
    if (continuousKiExtraction.intervalHours !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS] =
        continuousKiExtraction.intervalHours;
    }
    if (continuousKiExtraction.excludedStreamPatterns !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS] =
        continuousKiExtraction.excludedStreamPatterns;
    }

    if (Object.keys(updates).length > 0) {
      await globalUiSettingsClient.setMany(updates);
    }

    return { success: true };
  },
});

export const internalSignificantEventsSettingsRoutes = {
  ...putSignificantEventsSettingsRoute,
};
