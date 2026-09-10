/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Message } from '@kbn/inference-common';
import type {
  InferenceProceedCapability,
  PiiTokenizationContext,
} from './workflow_anonymization_capabilities';

export interface AroundCompletionEvent {
  readonly system?: string;
  readonly messages: readonly Message[];
  readonly sessionId?: string;
  readonly agentId?: string;
}

export type WorkflowAroundCompletionResult =
  | { matched: false }
  | { matched: true; content: string };

export interface WorkflowAnonymizationProvider {
  /**
   * Whether this provider supports synchronous (within-request) workflow execution.
   * Checked at runtime before the hook path is entered; must be `true` for
   * providers that implement the around-completion flow.
   */
  readonly supportsSynchronousExecution: boolean;
  execute(options: {
    event: AroundCompletionEvent;
    namespace: string;
    request: KibanaRequest;
    pii: PiiTokenizationContext;
    proceed: InferenceProceedCapability;
    abortSignal?: AbortSignal;
  }): Promise<WorkflowAroundCompletionResult>;
  /**
   * Returns a per-space failure mode override, or `undefined` when no override is
   * configured for this space. The pipeline falls back to the cluster-level
   * `xpack.inference.anonymization.failureMode` config when this returns `undefined`.
   *
   * Implementations should cache the result for the duration of the trigger cache TTL
   * (default 30 s) to avoid an ES lookup on every inference request.
   */
  getFailureMode?(namespace: string): Promise<'block' | 'allow_unsafe' | undefined>;
}
