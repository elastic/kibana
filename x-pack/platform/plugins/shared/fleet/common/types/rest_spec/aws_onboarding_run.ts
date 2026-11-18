/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionStatus } from '@kbn/workflows';

import type { GetAwsOnboardingStackResponse } from './aws_onboarding';

/** The onboarding execution's own status, as the workflow engine reports it. */
export type AwsOnboardingRunStatus = `${ExecutionStatus}`;

export type AwsOnboardingRunStackPhase =
  | 'pending'
  | 'in_progress'
  | 'complete'
  | 'failed'
  | 'skipped';

export type AwsOnboardingRunConnectorPhase = 'pending' | 'complete' | 'failed' | 'reused';

export type AwsOnboardingRunPoliciesPhase = 'pending' | 'in_progress' | 'complete' | 'failed';

/** `failed` only when the run ended while waiting for data (cancelled, timed out or failed). */
export type AwsOnboardingRunDataPhase = 'pending' | 'waiting' | 'complete' | 'partial' | 'failed';

export type AwsOnboardingRunStackResource = GetAwsOnboardingStackResponse['resources'][number];

/** The progress of one onboarding run, from its identity stack to the data arriving. */
export interface AwsOnboardingRunProgress {
  status: AwsOnboardingRunStatus;
  stack: {
    phase: AwsOnboardingRunStackPhase;
    stack_id?: string;
    stack_name?: string;
    stack_status?: string;
    reason?: string;
    /** Each resource's newest event, oldest first; read live only while the stack is moving. */
    resources: AwsOnboardingRunStackResource[];
  };
  connector: {
    phase: AwsOnboardingRunConnectorPhase;
    name?: string;
    cloud_connector_id?: string;
  };
  policies: {
    phase: AwsOnboardingRunPoliciesPhase;
    items: Array<{ service: string; name?: string; policy_id?: string; has_data?: boolean }>;
  };
  /**
   * Data arriving. Named `ingest`, not `data`: Fleet's shared request helper unwraps a top-level
   * `data` key of any response body, which would hand the browser this phase alone.
   */
  ingest: {
    phase: AwsOnboardingRunDataPhase;
    waited_seconds?: number;
  };
  dashboard_path?: string;
  error?: string;
}
