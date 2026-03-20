/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { isEqual, uniq } from 'lodash';
import { conditionSchema } from '@kbn/streamlang';

const featureStatus = ['active', 'stale', 'expired'] as const;
export const featureStatusSchema = z.enum(featureStatus);
export type FeatureStatus = z.infer<typeof featureStatusSchema>;

export const DATASET_ANALYSIS_FEATURE_TYPE = 'dataset_analysis' as const;
export const LOG_SAMPLES_FEATURE_TYPE = 'log_samples' as const;
export const LOG_PATTERNS_FEATURE_TYPE = 'log_patterns' as const;
export const ERROR_LOGS_FEATURE_TYPE = 'error_logs' as const;

export const COMPUTED_FEATURE_TYPES = [
  DATASET_ANALYSIS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
] as const;

export const baseFeatureSchema = z.object({
  id: z.string(),
  stream_name: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  properties: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()).optional(),
  evidence_doc_ids: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  filter: conditionSchema.optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type BaseFeature = z.infer<typeof baseFeatureSchema>;

export const featureSchema = baseFeatureSchema.and(
  z.object({
    uuid: z.string(),
    status: featureStatusSchema,
    last_seen: z.string(),
    expires_at: z.string().optional(),
  })
);

export type Feature = z.infer<typeof featureSchema>;

export function isFeature(feature: unknown): feature is Feature {
  return featureSchema.safeParse(feature).success;
}

export function isComputedFeature(feature: BaseFeature): boolean {
  return (COMPUTED_FEATURE_TYPES as unknown as string[]).includes(feature.type);
}

export function hasSameFingerprint(feature: BaseFeature, other: BaseFeature): boolean {
  return (
    feature.type === other.type &&
    feature.subtype === other.subtype &&
    isEqual(feature.properties, other.properties)
  );
}

export function isDuplicateFeature(feature: BaseFeature, other: BaseFeature): boolean {
  return feature.id.toLowerCase() === other.id.toLowerCase() || hasSameFingerprint(feature, other);
}

const mergeArrays = (a: string[] = [], b: string[] = []) => uniq([...a, ...b]);

export function toBaseFeature(feature: Feature): BaseFeature {
  return {
    id: feature.id,
    stream_name: feature.stream_name,
    type: feature.type,
    subtype: feature.subtype,
    title: feature.title,
    description: feature.description,
    properties: feature.properties,
    confidence: feature.confidence,
    evidence: feature.evidence,
    evidence_doc_ids: feature.evidence_doc_ids,
    tags: feature.tags,
    filter: feature.filter,
    meta: feature.meta,
  };
}

export function mergeFeature(existing: BaseFeature, incoming: BaseFeature): BaseFeature {
  const mergedEvidence = mergeArrays(existing.evidence, incoming.evidence);
  const mergedEvidenceDocIds = mergeArrays(existing.evidence_doc_ids, incoming.evidence_doc_ids);
  const mergedTags = mergeArrays(existing.tags, incoming.tags);
  const mergedMeta = { ...(existing.meta ?? {}), ...(incoming.meta ?? {}) };
  const mergedProperties = { ...(existing.properties ?? {}), ...(incoming.properties ?? {}) };
  const confidence = Math.round((existing.confidence + incoming.confidence) / 2);
  const filter = incoming.filter ?? existing.filter;

  return {
    id: existing.id,
    stream_name: existing.stream_name,
    type: existing.type,
    subtype: existing.subtype,
    title: incoming.title,
    description: incoming.description,
    properties: mergedProperties,
    confidence,
    evidence: mergedEvidence.length > 0 ? mergedEvidence : undefined,
    evidence_doc_ids: mergedEvidenceDocIds.length > 0 ? mergedEvidenceDocIds : undefined,
    tags: mergedTags.length > 0 ? mergedTags : undefined,
    filter,
    meta: Object.keys(mergedMeta).length > 0 ? mergedMeta : undefined,
  };
}
