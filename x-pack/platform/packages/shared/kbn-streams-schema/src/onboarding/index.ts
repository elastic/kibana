/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentifyFeaturesResult } from '../api/features';
import type { SignificantEventsQueriesGenerationResult } from '../api/significant_events';
import type { TaskResult } from '../tasks/types';

export interface OnboardingResult {
  featuresTaskResult?: TaskResult<IdentifyFeaturesResult>;
  queriesTaskResult?: TaskResult<SignificantEventsQueriesGenerationResult>;
}

export enum OnboardingStep {
  FeaturesIdentification = 'features_identification',
  QueriesGeneration = 'queries_generation',
}
