/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { awsOnboardingProvider } from '../providers/aws/provider_definition';
import type { OnboardingProviderDefinition } from './provider_types';

const ONBOARDING_PROVIDERS = new Map<string, OnboardingProviderDefinition>(
  [awsOnboardingProvider].map((provider) => [provider.id, provider])
);

/** Returns the onboarding provider for a route integration id, or undefined if unsupported. */
export const getOnboardingProvider = (id: string): OnboardingProviderDefinition | undefined =>
  ONBOARDING_PROVIDERS.get(id);
