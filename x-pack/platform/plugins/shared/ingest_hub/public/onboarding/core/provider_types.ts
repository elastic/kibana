/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OnboardingProviderMeta {
  title: string;
  description: string;
  icon: string;
}

/**
 * Static per-provider configuration the onboarding shell renders from. Not to be confused with
 * `AwsProviderAdapter`, which describes a provider's runtime flow state.
 *
 * Lives apart from `provider_registry.ts` so provider definitions and the registry can both
 * import it without depending on each other.
 */
export interface OnboardingProviderDefinition {
  /** Matches the `:integrationId` route segment. */
  id: string;
  meta: OnboardingProviderMeta;
}
