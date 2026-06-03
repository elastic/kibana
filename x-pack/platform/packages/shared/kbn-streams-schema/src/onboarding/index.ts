/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature } from '../feature';
import type { GeneratedSignificantEventQuery } from '../api/significant_events';

/** Summary of the features identification step of a completed onboarding run. */
export interface StreamsKIsOnboardingFeaturesResult {
  skipped: boolean;
  discovered: BaseFeature[];
  connectorUsed: string;
  tokensUsed: ChatCompletionTokenCount;
}

/** Summary of the queries generation step of a completed onboarding run. */
export interface StreamsKIsOnboardingQueriesResult {
  skipped: boolean;
  persisted: GeneratedSignificantEventQuery[];
  connectorUsed: string;
  tokensUsed: ChatCompletionTokenCount;
}

export interface StreamsKIsOnboardingResult {
  features: StreamsKIsOnboardingFeaturesResult;
  queries: StreamsKIsOnboardingQueriesResult;
}

export enum StreamsKIsOnboardingStep {
  FeaturesIdentification = 'features_identification',
  QueriesGeneration = 'queries_generation',
}

export enum WorkflowStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  /** Client-only optimistic state; the server never returns this value. */
  BeingCanceled = 'being_canceled',
  Canceled = 'canceled',
  Failed = 'failed',
  Completed = 'completed',
}

export type WorkflowStatusResult =
  | {
      status:
        | WorkflowStatus.NotStarted
        | WorkflowStatus.InProgress
        | WorkflowStatus.BeingCanceled
        | WorkflowStatus.Canceled;
    }
  | { status: WorkflowStatus.Failed; error: string }
  | ({ status: WorkflowStatus.Completed } & StreamsKIsOnboardingResult);

/** Statuses that indicate the onboarding pipeline is still active (running or pending cancel). */
export const STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES: ReadonlySet<WorkflowStatus> = new Set([
  WorkflowStatus.InProgress,
  WorkflowStatus.BeingCanceled,
]);
