/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { StepCategory } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { Streams, TaskStatus } from '@kbn/streams-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { GetScopedClients } from '../../routes/types';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
  type FeaturesIdentificationTaskParams,
} from '../tasks/task_definitions/features_identification';
import type { PersistedTask } from '../tasks/types';
import type { TaskClient } from '../tasks/task_client';
import type { StreamsTaskType } from '../tasks/task_definitions';

import { resolveConnectorId } from '../../routes/utils/resolve_connector_id';
import {
  KI_SELECT_STREAMS_STEP_TYPE,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MAX_SCHEDULED_STREAMS,
} from '../../../common/constants';
import {
  parseExcludePatterns,
  matchesExcludePatterns,
  type streamCandidateSchema,
  kiSelectStreamsInputSchema,
  kiSelectStreamsOutputSchema,
} from '../../../common/continuous_extraction_schemas';

const DEFAULT_LOOKBACK_HOURS = 24;

type StreamCandidate = z.infer<typeof streamCandidateSchema>;

interface StreamSelectionResult {
  alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }>;
  candidates: StreamCandidate[];
  upToDate: StreamCandidate[];
  excluded: string[];
  excludePatterns: string[];
  eligibleNames: Set<string>;
}

/**
 * Classifies streams into buckets (excluded, already-running, candidates, up-to-date)
 * by walking the ES-sorted task list and comparing each stream's last activity
 * against the configured extraction interval.
 */
const classifyStreams = ({
  allStreams,
  sortedTasks,
  excludedStreamPatterns,
  intervalHours,
}: {
  allStreams: Streams.all.Definition[];
  sortedTasks: Array<PersistedTask<FeaturesIdentificationTaskParams>>;
  excludedStreamPatterns: string;
  intervalHours: number;
}): StreamSelectionResult => {
  const excludePatterns = parseExcludePatterns(excludedStreamPatterns);

  const excluded: string[] = [];
  const eligibleNames = new Set<string>();
  for (const stream of allStreams) {
    if (Streams.QueryStream.Definition.is(stream)) continue;
    if (matchesExcludePatterns(stream.name, excludePatterns)) {
      excluded.push(stream.name);
    } else {
      eligibleNames.add(stream.name);
    }
  }

  const intervalMs = intervalHours * 3_600_000;
  const now = Date.now();
  const alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }> = [];
  const candidates: StreamCandidate[] = [];
  const upToDate: StreamCandidate[] = [];
  const streamsWithTask = new Set<string>();

  // Walk tasks in ES-sorted order (null last_completed_at first, then oldest).
  // This preserves the sort for the candidates list without an in-memory re-sort.
  for (const task of sortedTasks) {
    const streamName = task.task.params.streamName;
    if (!eligibleNames.has(streamName)) continue;
    streamsWithTask.add(streamName);

    if (task.status === TaskStatus.InProgress || task.status === TaskStatus.BeingCanceled) {
      alreadyRunning.push({ streamName, scheduledAt: task.created_at || null });
    } else {
      const lastActivityAt =
        task.status === TaskStatus.Failed ? task.last_failed_at : task.last_completed_at;
      const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : 0;
      if (now - lastActivityMs >= intervalMs) {
        candidates.push({ streamName, lastCompletedAt: task.last_completed_at ?? null });
      } else {
        upToDate.push({ streamName, lastCompletedAt: task.last_completed_at ?? null });
      }
    }
  }

  // Streams without any task have never been processed — same priority as never-completed.
  const noTaskStreams = [...eligibleNames].filter((name) => !streamsWithTask.has(name));
  const allCandidates = [
    ...noTaskStreams.map((name) => ({ streamName: name, lastCompletedAt: null })),
    ...candidates,
  ];

  return {
    alreadyRunning,
    candidates: allCandidates,
    upToDate,
    excluded,
    excludePatterns,
    eligibleNames,
  };
};

/**
 * Schedules feature identification tasks for the given candidates, handling
 * failures gracefully via Promise.allSettled.
 */
const scheduleCandidates = async ({
  toSchedule,
  taskClient,
  request,
  start,
  end,
  logger,
}: {
  toSchedule: StreamCandidate[];
  taskClient: TaskClient<StreamsTaskType>;
  request: KibanaRequest;
  start: number;
  end: number;
  logger: Pick<Logger, 'warn'>;
}): Promise<{ scheduled: StreamCandidate[]; failedToSchedule: StreamCandidate[] }> => {
  const results = await Promise.allSettled(
    toSchedule.map((candidate) =>
      taskClient
        .schedule({
          task: {
            id: getFeaturesIdentificationTaskId(candidate.streamName),
            type: FEATURES_IDENTIFICATION_TASK_TYPE,
            space: DEFAULT_SPACE_ID,
          },
          params: { start, end, streamName: candidate.streamName },
          request,
        })
        .then(() => candidate)
    )
  );

  const scheduled: StreamCandidate[] = [];
  const failedToSchedule: StreamCandidate[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      scheduled.push(result.value);
    } else {
      failedToSchedule.push(toSchedule[i]);
      logger.warn(
        `Failed to schedule KI extraction for stream ${toSchedule[i].streamName}: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`
      );
    }
  }

  return { scheduled, failedToSchedule };
};

export const registerKiSelectStreamsStep = ({
  workflowsExtensions,
  getScopedClients,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getScopedClients: GetScopedClients;
  logger: Logger;
}) => {
  workflowsExtensions.registerStepDefinition({
    id: KI_SELECT_STREAMS_STEP_TYPE,
    label: 'KI Select Streams',
    description:
      'Selects streams that need knowledge indicator extraction and schedules identification tasks.',
    category: StepCategory.Kibana,
    stability: 'tech_preview',
    inputSchema: kiSelectStreamsInputSchema,
    outputSchema: kiSelectStreamsOutputSchema,
    handler: async (context) => {
      const {
        maxScheduledStreams = MAX_SCHEDULED_STREAMS,
        lookbackHours = DEFAULT_LOOKBACK_HOURS,
        extractionIntervalHours,
      } = kiSelectStreamsInputSchema.parse(context.input ?? {});
      const request = context.contextManager.getFakeRequest();
      const { streamsClient, taskClient, modelSettingsClient, uiSettingsClient } =
        await getScopedClients({ request });

      const settings = await modelSettingsClient.getSettings();

      if (!settings.continuousKiExtraction?.enabled) {
        throw new Error('Continuous KI extraction is disabled');
      }

      const { continuousKiExtraction } = settings;

      const [connectorId, sortedTasks, allStreams] = await Promise.all([
        resolveConnectorId({
          connectorId: settings.connectorIdKnowledgeIndicatorExtraction,
          uiSettingsClient,
          logger,
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
        extractionIntervalHours ??
        continuousKiExtraction.intervalHours ??
        DEFAULT_EXTRACTION_INTERVAL_HOURS;

      const { alreadyRunning, candidates, upToDate, excluded, excludePatterns } = classifyStreams({
        allStreams,
        sortedTasks,
        excludedStreamPatterns: continuousKiExtraction.excludedStreamPatterns ?? '',
        intervalHours,
      });

      const availableSlots = Math.max(0, maxScheduledStreams - alreadyRunning.length);
      const toSchedule = candidates.slice(0, availableSlots);
      const skipped = candidates.slice(availableSlots);

      const now = Date.now();
      const end = now;
      const start = end - lookbackHours * 3_600_000;

      const { scheduled, failedToSchedule } = await scheduleCandidates({
        toSchedule,
        taskClient,
        request,
        start,
        end,
        logger: context.logger,
      });

      context.logger.info(
        `KI extraction: ${scheduled.length} scheduled, ${failedToSchedule.length} failed, ${alreadyRunning.length} running, ${skipped.length} skipped, ${upToDate.length} up-to-date`
      );

      return {
        output: {
          connectorId,
          scheduled,
          failedToSchedule,
          alreadyRunning,
          skipped,
          upToDate,
          excluded,
          settings: {
            enabled: continuousKiExtraction.enabled ?? false,
            intervalHours:
              continuousKiExtraction.intervalHours ?? DEFAULT_EXTRACTION_INTERVAL_HOURS,
            excludePatterns,
          },
        },
      };
    },
  });
};
