/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffectivePolicy, AnonymizationProfile } from '@kbn/anonymization-common';

/**
 * Describes a target for effective policy resolution.
 */
export interface AnonymizationTarget {
  type: 'data_view' | 'index_pattern' | 'index';
  id: string;
}

/**
 * The policy service contract exposed by the anonymization plugin.
 * Consumed by the inference plugin as an optional dependency.
 */
export interface AnonymizationPolicyService {
  /**
   * Resolves the effective field-based policy for a target.
   * For data_view targets, computes union across data view + index pattern profiles.
   */
  resolveEffectivePolicy: (
    namespace: string,
    target: AnonymizationTarget
  ) => Promise<EffectivePolicy>;

  /**
   * Retrieves a single profile by ID.
   */
  getProfile: (namespace: string, profileId: string) => Promise<AnonymizationProfile | null>;

  /**
   * Retrieves the per-space salt material for deterministic tokenization.
   */
  getSalt: (namespace: string) => Promise<string>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnonymizationPluginSetup {}

export interface AnonymizationPluginStart {
  /**
   * Returns the policy service for resolving anonymization policy.
   */
  getPolicyService: () => AnonymizationPolicyService;
}
