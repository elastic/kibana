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

export enum StreamsKIsOnboardingStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  /** Client-only optimistic state; the server never returns this value. */
  BeingCanceled = 'being_canceled',
  Canceled = 'canceled',
  Failed = 'failed',
  Completed = 'completed',
}

export type StreamsKIsOnboardingStatusResult =
  | {
      status:
        | StreamsKIsOnboardingStatus.NotStarted
        | StreamsKIsOnboardingStatus.InProgress
        | StreamsKIsOnboardingStatus.BeingCanceled
        | StreamsKIsOnboardingStatus.Canceled;
    }
  | { status: StreamsKIsOnboardingStatus.Failed; error: string }
  | ({ status: StreamsKIsOnboardingStatus.Completed } & StreamsKIsOnboardingResult);

/** Statuses that indicate the onboarding pipeline is still active (running or pending cancel). */
export const STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES: ReadonlySet<StreamsKIsOnboardingStatus> =
  new Set([StreamsKIsOnboardingStatus.InProgress, StreamsKIsOnboardingStatus.BeingCanceled]);
