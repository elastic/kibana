/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/**
 * Why a task run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'unexpected';

/**
 * Which credential a user-scoped task run authenticated with. Summing across all
 * values yields the total user-scoped task runs. Deliberately credential-agnostic
 * (not API-key specific) so future execution identities — e.g. service-account
 * tokens — extend it with new values instead of a breaking attribute rename.
 */
export type CredentialType = 'uiam_api_key' | 'es_api_key' | 'none';

/**
 * Why the run authenticated with that credential type. Set on every series so
 * grouping keys stay consistent: `provisioned` pairs with `uiam_api_key`,
 * `not_set` with `none`, `user_created_key` pairs with either key type (a task
 * whose key was supplied by the user), and the remaining values explain an
 * `es_api_key` run (project configured for ES keys, or a fallback because no
 * UIAM key was available). Shares the vocabulary of the alerting
 * `kibana.alerting.rule_run.count` counter so both metrics can be charted with
 * the same queries.
 */
export type CredentialReason =
  | 'provisioned'
  | 'config'
  | 'user_created_key'
  | 'fallback_unexpected'
  | 'not_set';

class TaskManagerUiamTelemetry {
  private readonly meter = metrics.getMeter('kibana.task_manager');

  private readonly uiamApiKeyFallbackCounter: Counter<Attributes>;
  private readonly taskRunCounter: Counter<Attributes>;

  constructor() {
    this.uiamApiKeyFallbackCounter = this.meter.createCounter(
      'kibana.task_manager.task_run.uiam_api_key_fallback.count',
      {
        description:
          'Number of task runs that fell back to the Elasticsearch API key because no UIAM API key was available.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
    this.taskRunCounter = this.meter.createCounter('kibana.task_manager.task_run.count', {
      description:
        'Number of user-scoped task runs, partitioned by the credential type the run authenticated with (credential.type) and why that credential was selected (credential.reason).',
      unit: '1',
      valueType: ValueType.INT,
    });
  }

  recordUiamApiKeyFallback = (reason: UiamApiKeyFallbackReason) => {
    this.uiamApiKeyFallbackCounter.add(1, { 'fallback.reason': reason });
  };

  recordTaskRun = (credentialType: CredentialType, credentialReason: CredentialReason) => {
    this.taskRunCounter.add(1, {
      'credential.type': credentialType,
      'credential.reason': credentialReason,
    });
  };
}

export const taskManagerUiamTelemetry = new TaskManagerUiamTelemetry();
