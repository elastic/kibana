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
import { STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID } from '@kbn/streams-schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import {
  STREAMS_API_PRIVILEGES,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MAX_SCHEDULED_STREAMS,
} from '../../../../../common/constants';
import {
  type FeaturesIdentificationTaskParams,
  FEATURES_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import {
  classifyStreams,
  parseExcludePatterns,
  type StreamCandidate,
  type StreamClassificationResult,
} from './classify_streams';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';

const DEFAULT_LOOKBACK_HOURS = 24;

export interface EligibleStreamsResponse {
  candidates: StreamCandidate[];
  alreadyRunning: StreamClassificationResult['alreadyRunning'];
  upToDate: StreamCandidate[];
  excluded: string[];
  unsupported: string[];
  skipped: StreamCandidate[];
  settings: {
    enabled: boolean;
    intervalHours: number;
    excludePatterns: string[];
  };
  connectorId: string;
  timeRange: {
    from: string;
    to: string;
  };
}

const NumberFromString = z.string().transform((value) => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  return Number(trimmed);
});

const eligibleStreamsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_extraction/_eligible',
  options: {
    access: 'internal',
    summary: 'List streams eligible for KI extraction',
    description:
      'Classifies streams into eligible candidates, already-running, up-to-date, and excluded buckets based on extraction settings and task state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        maxScheduledStreams: NumberFromString.pipe(z.number().positive().optional()),
        extractionIntervalHours: NumberFromString.pipe(z.number().min(0).optional()),
        lookbackHours: NumberFromString.pipe(z.number().positive().optional()),
        excludedStreamPatterns: z.string().optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<EligibleStreamsResponse> => {
    const { streamsClient, taskClient, globalUiSettingsClient, uiSettingsClient, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const query = params?.query ?? {};

    const enabled = await globalUiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
    );

    if (!enabled) {
      throw new StatusError('Continuous KI extraction is disabled', 400);
    }

    const [intervalHoursSetting, excludedStreamPatterns] = await Promise.all([
      globalUiSettingsClient.get<number>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS
      ),
      globalUiSettingsClient.get<string>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS
      ),
    ]);

    const maxStreams = query.maxScheduledStreams ?? MAX_SCHEDULED_STREAMS;
    const lookbackHours = query.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;

    const [connectorId, sortedTasks, allStreams] = await Promise.all([
      resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
        featureName: 'knowledge indicator extraction',
        request,
      }),
      taskClient.findByType<FeaturesIdentificationTaskParams>(FEATURES_IDENTIFICATION_TASK_TYPE, {
        sort: [
          {
            last_completed_at: {
              order: 'asc',
              missing: '_first',
              unmapped_type: 'date',
            },
          },
        ],
      }),
      streamsClient.listStreams(),
    ]);

    const intervalHours =
      query.extractionIntervalHours ?? intervalHoursSetting ?? DEFAULT_EXTRACTION_INTERVAL_HOURS;

    const resolvedExcludedPatterns = query.excludedStreamPatterns ?? excludedStreamPatterns ?? '';

    const { alreadyRunning, candidates, upToDate, excluded, unsupported } = classifyStreams({
      allStreams,
      sortedTasks,
      excludedStreamPatterns: resolvedExcludedPatterns,
      intervalHours,
    });

    const availableSlots = Math.max(0, maxStreams - alreadyRunning.length);
    const toSchedule = candidates.slice(0, availableSlots);
    const skipped = candidates.slice(availableSlots);

    const now = Date.now();
    const start = now - lookbackHours * 3_600_000;

    return {
      candidates: toSchedule,
      alreadyRunning,
      upToDate,
      excluded,
      unsupported,
      skipped,
      settings: {
        enabled,
        intervalHours: intervalHoursSetting ?? DEFAULT_EXTRACTION_INTERVAL_HOURS,
        excludePatterns: parseExcludePatterns(excludedStreamPatterns),
      },
      connectorId,
      timeRange: {
        from: new Date(start).toISOString(),
        to: new Date(now).toISOString(),
      },
    };
  },
});

export const internalEligibleStreamsRoutes = {
  ...eligibleStreamsRoute,
};
