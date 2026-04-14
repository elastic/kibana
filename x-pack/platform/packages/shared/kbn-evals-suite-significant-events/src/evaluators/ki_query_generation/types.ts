/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from '@kbn/streams-ai/src/significant_events/types';

export const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

export interface Query {
  esql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

export interface KIQueryGenerationEvaluationExample {
  input: { sample_logs: string[]; sample_docs?: Array<Record<string, unknown>> } & Record<
    string,
    unknown
  >;
  output: {
    expected_categories?: string[];
    expect_stats?: boolean;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

interface KIQueryGenerationTaskOutput {
  queries: Query[];
  toolUsage?: SignificantEventsToolUsage;
  traceId?: string | null;
}

export type KIQueryGenerationOutput = Query[] | KIQueryGenerationTaskOutput;

export const getQueriesFromOutput = (output: KIQueryGenerationOutput | undefined): Query[] => {
  if (!output) {
    return [];
  }
  return Array.isArray(output) ? output : output.queries ?? [];
};

export type KIQueryGenerationEvaluator = Evaluator<
  KIQueryGenerationEvaluationExample,
  KIQueryGenerationOutput
>;

export interface ScenarioCriteriaConfig {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria: EvaluationCriterion[];
}
