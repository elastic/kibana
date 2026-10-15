/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/significant-events-schema';

export type { IgnoredFeature } from '@kbn/significant-events-schema';

export interface PreviouslyIdentifiedFeature {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description?: string;
  properties: Record<string, unknown>;
}

export const toPreviouslyIdentifiedFeature = (
  feature: BaseFeature
): PreviouslyIdentifiedFeature => ({
  id: feature.id,
  type: feature.type,
  subtype: feature.subtype,
  title: feature.title,
  description: feature.description,
  properties: feature.properties,
});

export interface ExcludedFeatureSummary {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description?: string;
  properties: Record<string, unknown>;
}

export interface SearchSimilarFeaturesArguments {
  candidate_id: string;
  title: string;
  description: string;
  type: string;
}

export interface SimilarFeatureHit {
  id: string;
  title: string;
  description: string;
  confidence: number;
}
