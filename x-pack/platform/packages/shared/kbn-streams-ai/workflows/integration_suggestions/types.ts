/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';

export interface IntegrationSuggestionInput {
  streamName: string;
  features: Feature[];
}

export interface IntegrationPackageInfo {
  name: string;
  title: string;
  description?: string;
  version: string;
  categories?: string[];
}

export interface IntegrationSuggestionOutput {
  packageName: string;
  featureId: string;
  featureTitle: string;
  reason: string;
}

export interface SuggestIntegrationsResult {
  streamName: string;
  suggestions: IntegrationSuggestionOutput[];
  error?: string;
}

export interface SuggestIntegrationsEngineOptions {
  maxSteps?: number;
}
