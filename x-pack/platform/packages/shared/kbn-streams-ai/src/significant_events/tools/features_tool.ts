/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';

export type LlmFeature = Pick<
  Feature,
  | 'id'
  | 'type'
  | 'subtype'
  | 'title'
  | 'description'
  | 'confidence'
  | 'properties'
  | 'evidence'
  | 'tags'
>;

export function toLlmFeature(feature: Feature): LlmFeature {
  return {
    id: feature.id,
    type: feature.type,
    subtype: feature.subtype,
    title: feature.title,
    description: feature.description,
    confidence: feature.confidence,
    properties: feature.properties,
    evidence: feature.evidence,
    tags: feature.tags,
  };
}
