/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/**
 * Why a rule run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'likely_non_cloud_user' | 'unexpected';

/**
 * Which credential a rule run authenticated with. Summing across all values
 * yields the total rule runs. Deliberately credential-agnostic (not API-key
 * specific) so future execution identities — e.g. service-account tokens —
 * extend it with new values instead of a breaking attribute rename.
 */
export type CredentialType = 'uiam_api_key' | 'es_api_key' | 'none';

/**
 * Why the run authenticated with that credential type. Set on every series so
 * grouping keys stay consistent: `provisioned` pairs with `uiam_api_key`,
 * `not_set` with `none`, `user_created_key` pairs with either key type (a rule
 * whose key was supplied by the user), and the remaining values explain an
 * `es_api_key` run (project configured for ES keys, or a fallback because no
 * UIAM key was available).
 */
export type CredentialReason =
  | 'provisioned'
  | 'config'
  | 'user_created_key'
  | 'fallback_likely_non_cloud_user'
  | 'fallback_unexpected'
  | 'not_set';

class AlertingUiamTelemetry {
  private readonly meter = metrics.getMeter('kibana.alerting');

  private readonly uiamApiKeyFallbackCounter: Counter<Attributes>;
  private readonly ruleRunCounter: Counter<Attributes>;

  constructor() {
    this.uiamApiKeyFallbackCounter = this.meter.createCounter(
      'kibana.alerting.rule_run.uiam_api_key_fallback.count',
      {
        description:
          'Number of rule runs that fell back to the Elasticsearch API key because no UIAM API key was available.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
    this.ruleRunCounter = this.meter.createCounter('kibana.alerting.rule_run.count', {
      description:
        'Number of rule runs (including backfill runs), partitioned by the credential type the run authenticated with (credential.type) and why that credential was selected (credential.reason).',
      unit: '1',
      valueType: ValueType.INT,
    });
  }

  recordUiamApiKeyFallback = (reason: UiamApiKeyFallbackReason) => {
    this.uiamApiKeyFallbackCounter.add(1, { 'fallback.reason': reason });
  };

  recordRuleRun = (credentialType: CredentialType, credentialReason: CredentialReason) => {
    this.ruleRunCounter.add(1, {
      'credential.type': credentialType,
      'credential.reason': credentialReason,
    });
  };
}

export const alertingUiamTelemetry = new AlertingUiamTelemetry();
