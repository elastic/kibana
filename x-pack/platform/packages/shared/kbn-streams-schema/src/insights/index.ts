/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { GenerateDescriptionResult } from '../api/description_generation';
import type { IdentifyFeaturesResult } from '../api/features';
import type { SignificantEventsQueriesGenerationResult } from '../api/significant_events';
import type { TaskResult } from '../tasks/types';

export type InsightImpactLevel = 'critical' | 'high' | 'medium' | 'low';

interface InsightEvidence {
  streamName: string;
  queryTitle: string;
  featureName?: string;
  eventCount: number;
}

export interface Insight {
  title: string;
  description: string;
  impact: InsightImpactLevel;
  evidence: InsightEvidence[];
  recommendations: string[];
}

export interface InsightsResult {
  insights: Insight[];
  tokensUsed: ChatCompletionTokenCount;
}

export interface InsightsOnboardingResult {
  descriptionTaskResult?: TaskResult<GenerateDescriptionResult>;
  featuresTaskResult?: TaskResult<IdentifyFeaturesResult>;
  queriesTaskResult?: TaskResult<SignificantEventsQueriesGenerationResult>;
}

export enum InsightsOnboardingStep {
  DescriptionGeneration = 'description_generation',
  FeaturesIdentification = 'features_identification',
  QueriesGeneration = 'queries_generation',
}
