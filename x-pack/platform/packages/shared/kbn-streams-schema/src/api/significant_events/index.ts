/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { EsqlQuery, QueryType, StreamQuery } from '../../queries';
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

type SignificantEventsResponse = StreamQuery & {
  stream_name: string;
  occurrences: SignificantEventOccurrence[];
  change_points: {
    type: Partial<Record<ChangePointsType, ChangePointsValue>>;
  };
  rule_backed: boolean;
};

interface SignificantEventsGetResponse {
  significant_events: SignificantEventsResponse[];
  aggregated_occurrences: SignificantEventOccurrence[];
}

type SignificantEventsPreviewResponse = Pick<
  SignificantEventsResponse,
  'occurrences' | 'change_points' | 'esql'
> & {
  /**
   * For STATS queries only: how many result rows the preview returned.
   * With a single GROUP BY dimension this equals unique time buckets
   * that breached the threshold. With multiple dimensions (`multi_group`)
   * this is the total entity × bucket cells, not unique time buckets.
   * Absent for match-type queries.
   */
  firing_count?: number;
  /**
   * True when the STATS preview hit the server-side row limit and the
   * `firing_count` / sparkline data may be incomplete.
   */
  truncated?: boolean;
  /**
   * For STATS queries with multiple GROUP BY dimensions (beyond the
   * temporal bucket): true means the sparkline sums firing cells across
   * entity groups per bucket, so each y-value represents "how many
   * entity × bucket cells breached" rather than unique events.
   */
  multi_group?: boolean;
};

interface GeneratedSignificantEventQuery {
  type: QueryType;
  title: string;
  esql: EsqlQuery;
  severity_score: number;
  evidence?: string[];
  description: string;
  replaces?: string;
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
