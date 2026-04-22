/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import type { Logger } from '@kbn/logging';
import {
  type Feature,
  type BaseFeature,
  isDuplicateFeature,
  hasSameFingerprint,
  mergeFeature,
  toBaseFeature,
} from '@kbn/streams-schema';
import type { IgnoredFeature } from '@kbn/streams-ai';
import { DEFAULT_SIG_EVENTS_TUNING_CONFIG } from '../../../../common/sig_events_tuning_config';
import { MS_PER_DAY } from './iteration_state';

export const toFeatureSummary = ({ id, title }: Feature) => ({ id, title: title ?? id });

export const toFeatureProjection = ({
  id,
  type,
  subtype,
  title,
  description,
  properties,
}: Feature) => ({
  id,
  type,
  subtype,
  title,
  description,
  properties,
});

export function createFeatureMetadata({
  featureTtlDays = DEFAULT_SIG_EVENTS_TUNING_CONFIG.feature_ttl_days,
  runId,
}: {
  featureTtlDays?: number;
  runId: string;
}) {
  const now = Date.now();
  return {
    status: 'active' as const,
    last_seen: new Date(now).toISOString(),
    expires_at: new Date(now + featureTtlDays * MS_PER_DAY).toISOString(),
    run_id: runId,
  };
}

export function reconcileComputedFeatures({
  computedFeatures,
  streamName,
  featureTtlDays,
  runId,
}: {
  computedFeatures: BaseFeature[];
  streamName: string;
  featureTtlDays?: number;
  runId: string;
}): Feature[] {
  const metadata = createFeatureMetadata({ featureTtlDays, runId });
  return computedFeatures.map((feature) => ({
    ...feature,
    ...metadata,
    uuid: uuidv5(`${streamName}:${feature.id}`, uuidv5.DNS),
  }));
}

function filterExcluded(
  rawFeatures: ReadonlyArray<BaseFeature>,
  excludedFeatures: ReadonlyArray<Feature>,
  logger: Logger
): { nonExcluded: BaseFeature[]; codeIgnoredCount: number } {
  const excludedByLowerId = new Set(excludedFeatures.map((f) => f.id.toLowerCase()));
  let codeIgnoredCount = 0;

  const nonExcluded = rawFeatures.filter((feature) => {
    const lowerId = feature.id.toLowerCase();
    if (excludedByLowerId.has(lowerId)) {
      codeIgnoredCount++;
      logger.debug(`Dropping inferred feature [${feature.id}] matches excluded feature by ID`);
      return false;
    }
    const fingerprintMatch = excludedFeatures.find((excluded) =>
      hasSameFingerprint(feature, excluded)
    );
    if (fingerprintMatch) {
      codeIgnoredCount++;
      logger.debug(
        `Dropping inferred feature [${feature.id}] because it matches excluded feature [${fingerprintMatch.id}] by fingerprint`
      );
      return false;
    }
    return true;
  });

  return { nonExcluded, codeIgnoredCount };
}

export function reconcileInferredFeatures({
  rawFeatures,
  allKnownFeatures,
  discoveredFeatures,
  ignoredFeatures,
  excludedFeatures,
  featureTtlDays,
  runId,
  logger,
}: {
  rawFeatures: BaseFeature[];
  allKnownFeatures: Feature[];
  discoveredFeatures: ReadonlyArray<Feature>;
  ignoredFeatures: IgnoredFeature[];
  excludedFeatures: ReadonlyArray<Feature>;
  featureTtlDays?: number;
  runId: string;
  logger: Logger;
}): { newFeatures: Feature[]; updatedFeatures: Feature[]; codeIgnoredCount: number } {
  const metadata = createFeatureMetadata({ featureTtlDays, runId });
  const newFeatures: Feature[] = [];
  const updatedFeatures: Feature[] = [];

  for (const ignored of ignoredFeatures) {
    logger.debug(
      `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  const { nonExcluded, codeIgnoredCount } = filterExcluded(rawFeatures, excludedFeatures, logger);

  const discoveredSet = new Set(discoveredFeatures.map((f) => f.uuid));
  const byLowerId = new Map<string, Feature>();
  for (const f of allKnownFeatures) {
    byLowerId.set(f.id.toLowerCase(), f);
  }

  for (const raw of nonExcluded) {
    const match =
      byLowerId.get(raw.id.toLowerCase()) ??
      allKnownFeatures.find((f) => isDuplicateFeature(f, raw));

    if (match) {
      if (!discoveredSet.has(match.uuid)) {
        updatedFeatures.push({ ...raw, ...metadata, uuid: match.uuid });
      } else {
        const merged = mergeFeature(match, raw);
        if (!isEqual(merged, toBaseFeature(match))) {
          updatedFeatures.push({ ...merged, ...metadata, uuid: match.uuid });
        }
      }
    } else {
      newFeatures.push({ ...raw, ...metadata, uuid: uuid() });
    }
  }

  return { newFeatures, updatedFeatures, codeIgnoredCount };
}
