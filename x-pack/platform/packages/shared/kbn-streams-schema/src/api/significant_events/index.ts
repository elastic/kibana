/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Condition } from '@kbn/streamlang';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StreamQueryKql } from '../../queries';
import type { TaskStatus } from '../../tasks/types';

/**
 * SignificantEvents Get Response
 */
type ChangePointsType =
  | 'dip'
  | 'distribution_change'
  | 'non_stationary'
  | 'spike'
  | 'stationary'
  | 'step_change'
  | 'trend_change';

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

type SignificantEventsResponse = StreamQueryKql & {
  stream_name: string;
  occurrences: SignificantEventOccurrence[];
  change_points: {
    type: Partial<Record<ChangePointsType, ChangePointsValue>>;
  };
};

interface SignificantEventsGetResponse {
  significant_events: SignificantEventsResponse[];
  aggregated_occurrences: SignificantEventOccurrence[];
}

type SignificantEventsPreviewResponse = Pick<
  SignificantEventsResponse,
  'occurrences' | 'change_points' | 'kql'
>;

interface GeneratedSignificantEventQuery {
  title: string;
  kql: string;
  feature?: {
    name: string;
    filter: Condition;
    type: 'system';
  };
  severity_score: number;
  evidence?: string[];
}

type SignificantEventsGenerateResponse = Observable<
  ServerSentEventBase<
    'generated_queries',
    { queries: GeneratedSignificantEventQuery[]; tokensUsed: ChatCompletionTokenCount }
  >
>;

interface SignificantEventsQueriesGenerationResult {
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: Pick<ChatCompletionTokenCount, 'prompt' | 'completion'>;
}

type SignificantEventsQueriesGenerationTaskResult =
  | {
      status:
        | TaskStatus.NotStarted
        | TaskStatus.InProgress
        | TaskStatus.Stale
        | TaskStatus.BeingCanceled
        | TaskStatus.Canceled;
    }
  | {
      status: TaskStatus.Failed;
      error: string;
    }
  | ({
      status: TaskStatus.Completed | TaskStatus.Acknowledged;
    } & SignificantEventsQueriesGenerationResult);

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsGenerateResponse,
  SignificantEventsQueriesGenerationResult,
  SignificantEventsQueriesGenerationTaskResult,
};
