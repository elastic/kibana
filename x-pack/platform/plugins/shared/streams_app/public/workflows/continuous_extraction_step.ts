/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { baseFeatureSchema } from '@kbn/streams-schema';
import {
  KI_SELECT_STREAMS_STEP_TYPE,
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
} from '@kbn/streams-plugin/common';

const featureSummarySchema = baseFeatureSchema.pick({
  id: true,
  title: true,
});

const scheduledItemSchema = z.object({
  streamName: z.string(),
  lastCompletedAt: z.string().nullable(),
});

export const kiSelectStreamsPublicStepDefinition: PublicStepDefinition = {
  id: KI_SELECT_STREAMS_STEP_TYPE,
  label: 'KI Select Streams',
  description:
    'Selects streams that need knowledge indicator extraction and schedules identification tasks.',
  category: StepCategory.Kibana,
  inputSchema: z.object({}),
  outputSchema: z.object({
    connectorId: z.string(),
    scheduled: z.array(scheduledItemSchema),
    failedToSchedule: z.array(scheduledItemSchema),
    alreadyRunning: z.array(
      z.object({ streamName: z.string(), scheduledAt: z.string().nullable() })
    ),
    skipped: z.array(scheduledItemSchema),
    upToDate: z.array(scheduledItemSchema),
    excluded: z.array(z.string()),
    settings: z.object({
      enabled: z.boolean(),
      intervalHours: z.number(),
    }),
  }),
};

const tokenCountSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number(),
});

const iterationSchema = z.object({
  iteration: z.number(),
  durationMs: z.number(),
  state: z.string(),
  tokensUsed: tokenCountSchema,
  newFeatures: z.array(featureSummarySchema),
  updatedFeatures: z.array(featureSummarySchema),
});

export const kiFeaturesExtractStreamPublicStepDefinition: PublicStepDefinition = {
  id: KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  label: 'KI Features Extraction (per-stream)',
  description:
    'Polls a scheduled KI features identification task for a single stream until completion and reports results.',
  category: StepCategory.Kibana,
  inputSchema: z.object({
    streamName: z.string(),
  }),
  outputSchema: z.object({
    streamName: z.string(),
    status: z.string(),
    summary: z.object({
      durationMs: z.number(),
      tokensUsed: tokenCountSchema,
      features: z.object({
        llm: z.array(featureSummarySchema),
        computed: z.array(featureSummarySchema),
      }),
    }),
    iterations: z.array(iterationSchema),
  }),
};
