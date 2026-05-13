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
  OBSERVABILITY_STREAMS_CODE_SEARCH_SUPPORT_ENABLED,
} from '@kbn/management-settings-ids';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { FeatureNotEnabledError } from '../../../../lib/streams/errors/feature_not_enabled_error';
import {
  STREAMS_API_PRIVILEGES,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '../../../../../common/constants';

const putSignificantEventsSettingsBodySchema = z.object({
  continuousKiExtraction: z
    .object({
      enabled: z.boolean().optional(),
      intervalHours: z.number().min(MIN_EXTRACTION_INTERVAL_HOURS).optional(),
      excludedStreamPatterns: z.string().optional(),
    })
    .optional(),
  codeSearchSupport: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export const putSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Update significant events settings',
    description:
      'Updates significant events settings including continuous KI extraction and code search support, ensuring the associated workflows and agentic interfaces are created or removed accordingly.',
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
    continuousKiOnboardingWorkflowService,
    scsAgenticInterfaceService,
    logger,
  }): Promise<{ success: true }> => {
    const { licensing, uiSettingsClient, globalUiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { continuousKiExtraction, codeSearchSupport } = params.body;

    const updates: Record<string, boolean | number | string> = {};

    if (continuousKiExtraction?.enabled !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] =
        continuousKiExtraction.enabled;
    }
    if (continuousKiExtraction?.intervalHours !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS] =
        continuousKiExtraction.intervalHours;
    }
    if (continuousKiExtraction?.excludedStreamPatterns !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS] =
        continuousKiExtraction.excludedStreamPatterns;
    }
    if (codeSearchSupport?.enabled !== undefined) {
      updates[OBSERVABILITY_STREAMS_CODE_SEARCH_SUPPORT_ENABLED] = codeSearchSupport.enabled;
    }

    const previousValues: Record<string, boolean | number | string> = {};
    const keys = Object.keys(updates);
    const allSettings = await globalUiSettingsClient.getAll<boolean | number | string>();
    if (keys.length > 0) {
      for (const key of keys) {
        previousValues[key] = allSettings[key];
      }
      await globalUiSettingsClient.setMany(updates);
    }

    try {
      if (continuousKiExtraction !== undefined) {
        if (!continuousKiOnboardingWorkflowService) {
          throw new FeatureNotEnabledError('Workflows management is not available');
        }
        const enabled =
          continuousKiExtraction.enabled ??
          (allSettings[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] as boolean);
        await continuousKiOnboardingWorkflowService.ensureWorkflow({
          enabled,
          request,
        });
      }

      if (codeSearchSupport !== undefined) {
        if (!scsAgenticInterfaceService) {
          throw new Error('SCS agentic interface service is not available');
        }
        const enabled =
          codeSearchSupport.enabled ??
          (allSettings[OBSERVABILITY_STREAMS_CODE_SEARCH_SUPPORT_ENABLED] as boolean);
        await scsAgenticInterfaceService.ensureAgenticInterfaces({ enabled, request });
      }
    } catch (err) {
      if (Object.keys(previousValues).length > 0) {
        await globalUiSettingsClient.setMany(previousValues).catch((rollbackErr) => {
          logger.warn(`Failed to rollback settings after service sync error: ${rollbackErr}`);
        });
      }
      throw err;
    }

    return { success: true };
  },
});

export const internalSignificantEventsSettingsRoutes = {
  ...putSignificantEventsSettingsRoute,
};
