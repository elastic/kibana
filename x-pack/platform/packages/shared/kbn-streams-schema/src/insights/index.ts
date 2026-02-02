/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';

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
