/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Logger } from '@kbn/logging';
import {
  type Feature,
  type FeatureUpsert,
  type BaseFeature,
  hasSameFingerprint,
  mergeFeature,
  normalizeFeatureSlug,
  normalizeFeatureSlugForMatching,
  toBaseFeature,
} from '@kbn/significant-events-schema';
import type { IgnoredFeature } from '@kbn/streams-ai';

export const toFeatureSummary = ({ id, title }: BaseFeature) => ({ id, title: title ?? id });

export const toFeatureProjection = ({
  id,
  type,
  subtype,
  title,
  description,
  properties,
}: BaseFeature) => ({
  id,
  type,
  subtype,
  title,
  description,
  properties,
});

export function createFeatureMetadata({ runId }: { runId: string }) {
  return { run_id: runId };
}

export function reconcileComputedFeatures({
  computedFeatures,
  streamName,
  runId,
}: {
  computedFeatures: BaseFeature[];
  streamName: string;
  runId: string;
}): FeatureUpsert[] {
  const metadata = createFeatureMetadata({ runId });
  return computedFeatures.map((feature) => ({
    ...feature,
    ...metadata,
  }));
}

type FeatureMatchTier = 'exact' | 'alias' | 'normalized' | 'fingerprint';

interface FeatureMatch {
  feature: Feature;
  tier: FeatureMatchTier;
}

const getFeatureMatchKey = (type: string, id: string): string => `${type}:${id}`;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const addFeatureCandidate = (
  candidatesByKey: Map<string, Feature[]>,
  key: string,
  feature: Feature
): void => {
  const candidates = candidatesByKey.get(key);
  if (candidates) {
    candidates.push(feature);
  } else {
    candidatesByKey.set(key, [feature]);
  }
};

const pickLatestFeature = (candidates: ReadonlyArray<Feature> | undefined): Feature | undefined => {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((latest, candidate) =>
    (candidate.updated_at ?? '') > (latest.updated_at ?? '') ? candidate : latest
  );
};

function filterExcluded(
  rawFeatures: ReadonlyArray<BaseFeature>,
  excludedFeatures: ReadonlyArray<Feature>,
  logger: Logger
): { nonExcluded: BaseFeature[]; codeIgnoredCount: number } {
  const excludedByLowerId = new Set(excludedFeatures.map((f) => normalizeFeatureSlug(f.id)));
  let codeIgnoredCount = 0;

  const nonExcluded = rawFeatures.filter((feature) => {
    const lowerId = normalizeFeatureSlug(feature.id);
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
  runId,
  logger,
}: {
  rawFeatures: BaseFeature[];
  allKnownFeatures: Feature[];
  discoveredFeatures: ReadonlyArray<Feature>;
  ignoredFeatures: IgnoredFeature[];
  excludedFeatures: ReadonlyArray<Feature>;
  runId: string;
  logger: Logger;
}): {
  newFeatures: FeatureUpsert[];
  updatedFeatures: FeatureUpsert[];
  codeIgnoredCount: number;
  remappedCount: number;
} {
  const metadata = createFeatureMetadata({ runId });
  const newFeatures: FeatureUpsert[] = [];
  const updatedFeatures: FeatureUpsert[] = [];
  let remappedCount = 0;

  for (const ignored of ignoredFeatures) {
    logger.debug(
      `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  const { nonExcluded, codeIgnoredCount } = filterExcluded(rawFeatures, excludedFeatures, logger);

  const discoveredSet = new Set(
    discoveredFeatures.map((feature) =>
      getFeatureMatchKey(feature.type, normalizeFeatureSlug(feature.id))
    )
  );
  const byExactId = new Map<string, Feature[]>();
  const byAlias = new Map<string, Feature[]>();
  const byNormalizedId = new Map<string, Feature[]>();

  for (const feature of allKnownFeatures) {
    addFeatureCandidate(
      byExactId,
      getFeatureMatchKey(feature.type, normalizeFeatureSlug(feature.id)),
      feature
    );
    addFeatureCandidate(
      byNormalizedId,
      getFeatureMatchKey(feature.type, normalizeFeatureSlugForMatching(feature.id)),
      feature
    );

    for (const alias of getStringArray(feature.meta?.aliases)) {
      const normalizedAlias = normalizeFeatureSlug(alias);
      if (normalizedAlias.length > 0) {
        addFeatureCandidate(byAlias, getFeatureMatchKey(feature.type, normalizedAlias), feature);
      }
    }
  }

  for (const raw of nonExcluded) {
    const normalizedRawId = normalizeFeatureSlug(raw.id);
    const typedRawId = getFeatureMatchKey(raw.type, normalizedRawId);
    const typedMatchingId = getFeatureMatchKey(raw.type, normalizeFeatureSlugForMatching(raw.id));
    const exactMatch = pickLatestFeature(byExactId.get(typedRawId));
    const aliasMatch = pickLatestFeature(byAlias.get(typedRawId));
    const normalizedMatch = pickLatestFeature(byNormalizedId.get(typedMatchingId));
    let match: FeatureMatch | undefined;

    if (exactMatch) {
      match = { feature: exactMatch, tier: 'exact' };
    } else if (aliasMatch) {
      match = { feature: aliasMatch, tier: 'alias' };
    } else if (normalizedMatch) {
      match = { feature: normalizedMatch, tier: 'normalized' };
    } else {
      const fingerprintMatch = pickLatestFeature(
        allKnownFeatures.filter((feature) => hasSameFingerprint(feature, raw))
      );
      if (fingerprintMatch) {
        match = { feature: fingerprintMatch, tier: 'fingerprint' };
      }
    }

    if (match) {
      if (match.tier !== 'exact') {
        remappedCount++;
      }

      const merged = mergeFeature(match.feature, raw);
      const matchKey = getFeatureMatchKey(
        match.feature.type,
        normalizeFeatureSlug(match.feature.id)
      );
      if (!discoveredSet.has(matchKey) || !isEqual(merged, toBaseFeature(match.feature))) {
        updatedFeatures.push({ ...merged, ...metadata });
      }
    } else {
      newFeatures.push({ ...raw, ...metadata });
    }
  }

  return {
    newFeatures,
    updatedFeatures,
    codeIgnoredCount,
    remappedCount,
  };
}
