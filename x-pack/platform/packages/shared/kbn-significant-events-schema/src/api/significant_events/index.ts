/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  esqlQuerySchema,
  queryFeatureSchema,
  queryTypeSchema,
  significantEventTypeSchema,
  type StreamQuery,
} from '../../queries';
import {
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../significant_events/constants';
import type { ChangePointType, DetectionSkip } from '../../significant_events/detections';
import type { SignificantEventResponse } from '../../significant_events/events';

type ChangePointsValue = Partial<{
  p_value: number;
  r_value: number;
  change_point: number;
  trend: string;
}>;

interface SignificantEventOccurrence {
  date: string;
  count: number;
}

type QueryWithOccurrences = StreamQuery & {
  /** Alerting rule UUID (`QueryLink.rule_id`); optional during rolling upgrades. */
  rule_uuid?: string;
  source_id: string;
  occurrences: SignificantEventOccurrence[];
  change_points: {
    type: Partial<Record<ChangePointType, ChangePointsValue>>;
  };
  rule_backed: boolean;
  /** Enabled state of the backing alerting rule, omitted when lookup fails. */
  rule_enabled?: boolean;
};

interface QueryOccurrencesResponse {
  queries: QueryWithOccurrences[];
  aggregated_occurrences: SignificantEventOccurrence[];
}

export const generatedSignificantEventQuerySchema = lazySchema(() =>
  z.object({
    type: queryTypeSchema,
    title: z.string().max(MAX_TITLE_LENGTH),
    esql: esqlQuerySchema,
    category: significantEventTypeSchema.optional(),
    severity_score: z.number().min(0).max(100),
    description: z.string().max(MAX_TEXT_LENGTH),
    evidence: z.array(z.string().max(MAX_TEXT_LENGTH)).optional(),
    replaces: z.string().max(MAX_ID_LENGTH).optional(),
    features: z.array(queryFeatureSchema),
  })
);

type GeneratedSignificantEventQuery = z.infer<typeof generatedSignificantEventQuerySchema>;

interface SignificantEventsQueriesGenerationResult {
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: Pick<ChatCompletionTokenCount, 'prompt' | 'completion'>;
}

interface LifecycleDetection {
  detection_id: string;
  rule_name: string;
  /** Alerting rule that produced the detection; used to match event evidence. */
  rule_uuid?: string;
  /** Absent when the stored signal or detection carries no source. */
  source_id?: string;
  change_point_type: ChangePointType;
  '@timestamp': string;
  /** Set when the classifier closed this detection of the event's rule without the agent. */
  skip?: DetectionSkip;
}

interface EventLifecycleResponse {
  detections: LifecycleDetection[];
  events: SignificantEventResponse[];
  /** Set when the event has more skipped detections than the response carries. */
  skipped_truncated?: boolean;
}

export type {
  QueryWithOccurrences,
  QueryOccurrencesResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsQueriesGenerationResult,
  LifecycleDetection,
  EventLifecycleResponse,
};
