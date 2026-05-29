/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StreamsKIsOnboardingResult {
  featuresSkipped: boolean;
  discoveredFeatures: unknown[];
  featuresConnectorUsed: string;
  featuresTokensUsed: Record<string, unknown>;
  queriesSkipped: boolean;
  persistedQueries: unknown[];
  queriesConnectorUsed: string;
  queriesTokensUsed: Record<string, unknown>;
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
export const STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES: ReadonlySet<StreamsKIsOnboardingStatus> = new Set([
  StreamsKIsOnboardingStatus.InProgress,
  StreamsKIsOnboardingStatus.BeingCanceled,
]);
