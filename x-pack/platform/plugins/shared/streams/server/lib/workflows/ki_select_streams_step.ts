/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { Streams, TaskStatus } from '@kbn/streams-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { GetScopedClients } from '../../routes/types';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
  type FeaturesIdentificationTaskParams,
} from '../tasks/task_definitions/features_identification';
import { isStale } from '../tasks/is_stale';
import { resolveConnectorId } from '../../routes/utils/resolve_connector_id';
import {
  KI_SELECT_STREAMS_STEP_TYPE,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MAX_CONCURRENT_TASKS,
} from '../../../common/constants';

// Fixed look-back window for each extraction run; independent of the configurable
// scheduling interval, which controls *how often* we run, not *how far back* we look.
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const scheduledItemSchema = z.object({
  streamName: z.string(),
  lastCompletedAt: z.string().nullable(),
});

type ScheduledItem = z.infer<typeof scheduledItemSchema>;

const outputSchema = z.object({
  connectorId: z.string(),
  scheduled: z.array(scheduledItemSchema),
  failedToSchedule: z.array(scheduledItemSchema),
  alreadyRunning: z.array(z.object({ streamName: z.string(), scheduledAt: z.string().nullable() })),
  skipped: z.array(scheduledItemSchema),
  upToDate: z.array(scheduledItemSchema),
  excluded: z.array(z.string()),
  settings: z.object({
    enabled: z.boolean(),
    intervalHours: z.number(),
  }),
});

export const registerKiSelectStreamsStep = ({
  workflowsExtensions,
  getScopedClients,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getScopedClients: GetScopedClients;
  logger: Logger;
}) => {
  const stepLogger = logger.get('ki-select-streams-step');

  workflowsExtensions.registerStepDefinition({
    id: KI_SELECT_STREAMS_STEP_TYPE,
    label: 'KI Select Streams',
    description:
      'Selects streams that need knowledge indicator extraction and schedules identification tasks.',
    category: StepCategory.Kibana,
    inputSchema: z.object({}),
    outputSchema,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const { streamsClient, taskClient, modelSettingsClient, uiSettingsClient } =
        await getScopedClients({ request });

      const settings = await modelSettingsClient.getSettings();

      if (!settings.continuousExtraction?.enabled) {
        throw new Error('Continuous extraction is disabled');
      }

      const { continuousExtraction } = settings;

      const [connectorId, sortedTasks, allStreams] = await Promise.all([
        resolveConnectorId({
          connectorId: settings.connectorIdKnowledgeIndicatorExtraction,
          uiSettingsClient,
          logger: stepLogger,
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

      const excluded = new Set(continuousExtraction.excludedStreams ?? []);
      const eligibleNames = new Set(
        allStreams
          .filter(
            (stream) => !Streams.QueryStream.Definition.is(stream) && !excluded.has(stream.name)
          )
          .map((stream) => stream.name)
      );

      // Walk tasks in ES-sorted order (null last_completed_at first, then oldest).
      // This preserves the sort for the candidates list without an in-memory re-sort.
      const intervalHours = continuousExtraction.intervalHours ?? DEFAULT_EXTRACTION_INTERVAL_HOURS;
      const intervalMs = intervalHours * 3_600_000;
      const now = Date.now();
      const alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }> = [];
      const candidates: ScheduledItem[] = [];
      const upToDate: ScheduledItem[] = [];
      const streamsWithTask = new Set<string>();

      for (const task of sortedTasks) {
        const streamName = task.task.params.streamName;
        if (!eligibleNames.has(streamName)) continue;
        streamsWithTask.add(streamName);

        if (task.status === TaskStatus.InProgress && !isStale(task.created_at)) {
          alreadyRunning.push({ streamName, scheduledAt: task.created_at || null });
        } else {
          // Tasks that never completed (failed/stale) default to epoch 0,
          // so they are always eligible for rescheduling.
          const completedAt = task.last_completed_at
            ? new Date(task.last_completed_at).getTime()
            : 0;
          if (now - completedAt >= intervalMs) {
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

      const availableSlots = Math.max(0, MAX_CONCURRENT_TASKS - alreadyRunning.length);
      const toSchedule = allCandidates.slice(0, availableSlots);
      const skipped = allCandidates.slice(availableSlots);

      const scheduled: ScheduledItem[] = [];
      const failedToSchedule: ScheduledItem[] = [];
      const end = now;
      const start = end - TWENTY_FOUR_HOURS_MS;
      for (const candidate of toSchedule) {
        try {
          await taskClient.schedule({
            task: {
              id: getFeaturesIdentificationTaskId(candidate.streamName),
              type: FEATURES_IDENTIFICATION_TASK_TYPE,
              space: DEFAULT_SPACE_ID,
            },
            params: { start, end, streamName: candidate.streamName },
            request,
          });
          scheduled.push(candidate);
        } catch (err) {
          failedToSchedule.push(candidate);
          context.logger.warn(
            `Failed to schedule KI extraction for stream ${candidate.streamName}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

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
          excluded: [...excluded],
          settings: {
            enabled: continuousExtraction.enabled ?? false,
            intervalHours: continuousExtraction.intervalHours ?? DEFAULT_EXTRACTION_INTERVAL_HOURS,
          },
        },
      };
    },
  });
};
