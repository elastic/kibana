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
  candidate: FeatureCandidate;
  tier: FeatureMatchTier;
}

interface FeatureCandidate {
  feature: BaseFeature;
  origin: 'known' | 'new';
  updatedAt?: string;
}

interface FeatureCandidateIndexes {
  byExactId: Map<string, FeatureCandidate[]>;
  byAlias: Map<string, FeatureCandidate[]>;
  byNormalizedId: Map<string, FeatureCandidate[]>;
}

const getTypedFeatureKey = (type: string, id: string): string => `${type}:${id}`;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const addFeatureCandidate = (
  candidatesByKey: Map<string, FeatureCandidate[]>,
  key: string,
  candidate: FeatureCandidate
): void => {
  const candidates = candidatesByKey.get(key);
  if (!candidates) {
    candidatesByKey.set(key, [candidate]);
  } else if (!candidates.includes(candidate)) {
    candidates.push(candidate);
  }
};

const indexFeatureCandidate = (
  candidate: FeatureCandidate,
  { byExactId, byAlias, byNormalizedId }: FeatureCandidateIndexes
): void => {
  const { feature } = candidate;
  // Slug-only on purpose: the uuid is v5(stream, slug) with no type, so same-slug features
  // share one storage slot. A type-scoped miss here would write a "new" doc over that slot.
  addFeatureCandidate(byExactId, normalizeFeatureSlug(feature.id), candidate);
  addFeatureCandidate(
    byNormalizedId,
    getTypedFeatureKey(feature.type, normalizeFeatureSlugForMatching(feature.id)),
    candidate
  );

  for (const alias of getStringArray(feature.meta?.aliases)) {
    const normalizedAlias = normalizeFeatureSlug(alias);
    if (normalizedAlias.length > 0) {
      addFeatureCandidate(byAlias, getTypedFeatureKey(feature.type, normalizedAlias), candidate);
    }
  }
};

const pickLatestCandidate = (
  candidates: ReadonlyArray<FeatureCandidate> | undefined
): FeatureCandidate | undefined => {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((latest, candidate) =>
    (candidate.updatedAt ?? '') > (latest.updatedAt ?? '') ? candidate : latest
  );
};

const pickSurvivorCandidate = (
  candidates: ReadonlyArray<FeatureCandidate>,
  normalizedId: string
): FeatureCandidate | undefined => {
  const unversioned = candidates.filter(
    ({ feature }) => normalizeFeatureSlug(feature.id) === normalizedId
  );
  return pickLatestCandidate(unversioned.length > 0 ? unversioned : candidates);
};

// Every match lands on one survivor per family (type + version-stripped slug). Otherwise the
// prompt inventory keeps legacy versioned ids alive: the model re-emits them verbatim and the
// exact tier resets their TTL forever.
const routeToFamilySurvivor = (
  match: FeatureMatch,
  byNormalizedId: Map<string, FeatureCandidate[]>
): FeatureMatch => {
  const { feature } = match.candidate;
  const normalizedId = normalizeFeatureSlugForMatching(feature.id);
  const family = byNormalizedId.get(getTypedFeatureKey(feature.type, normalizedId));
  if (!family || family.length < 2) {
    return match;
  }
  const survivor = pickSurvivorCandidate(family, normalizedId);
  return survivor && survivor !== match.candidate ? { ...match, candidate: survivor } : match;
};

const findDirectMatch = (
  raw: BaseFeature,
  candidates: ReadonlyArray<FeatureCandidate>,
  { byExactId, byAlias, byNormalizedId }: FeatureCandidateIndexes
): FeatureMatch | undefined => {
  const normalizedRawId = normalizeFeatureSlug(raw.id);
  const exactMatch = pickLatestCandidate(byExactId.get(normalizedRawId));
  if (exactMatch) {
    return { candidate: exactMatch, tier: 'exact' };
  }

  const aliasMatch = pickLatestCandidate(
    byAlias.get(getTypedFeatureKey(raw.type, normalizedRawId))
  );
  if (aliasMatch) {
    return { candidate: aliasMatch, tier: 'alias' };
  }

  const matchingRawId = normalizeFeatureSlugForMatching(raw.id);
  const normalizedMatch = pickLatestCandidate(
    byNormalizedId.get(getTypedFeatureKey(raw.type, matchingRawId))
  );
  if (normalizedMatch) {
    return { candidate: normalizedMatch, tier: 'normalized' };
  }

  const fingerprintMatch = pickLatestCandidate(
    candidates.filter(({ feature }) => hasSameFingerprint(feature, raw))
  );
  return fingerprintMatch ? { candidate: fingerprintMatch, tier: 'fingerprint' } : undefined;
};

const findFeatureMatch = (
  raw: BaseFeature,
  candidates: ReadonlyArray<FeatureCandidate>,
  indexes: FeatureCandidateIndexes
): FeatureMatch | undefined => {
  const match = findDirectMatch(raw, candidates, indexes);
  return match ? routeToFamilySurvivor(match, indexes.byNormalizedId) : undefined;
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
  const newFeaturesById = new Map<string, FeatureUpsert>();
  const updatedFeaturesById = new Map<string, FeatureUpsert>();
  let remappedCount = 0;

  for (const ignored of ignoredFeatures) {
    logger.debug(
      `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  const { nonExcluded, codeIgnoredCount } = filterExcluded(rawFeatures, excludedFeatures, logger);

  const discoveredSet = new Set(
    discoveredFeatures.map((feature) =>
      getTypedFeatureKey(feature.type, normalizeFeatureSlug(feature.id))
    )
  );
  const candidates: FeatureCandidate[] = allKnownFeatures.map((feature) => ({
    feature: toBaseFeature(feature),
    origin: 'known',
    updatedAt: feature.updated_at,
  }));
  const indexes: FeatureCandidateIndexes = {
    byExactId: new Map(),
    byAlias: new Map(),
    byNormalizedId: new Map(),
  };
  for (const candidate of candidates) {
    indexFeatureCandidate(candidate, indexes);
  }

  for (const raw of nonExcluded) {
    const match = findFeatureMatch(raw, candidates, indexes);

    if (match) {
      // Remap = stored id differs from what the model wrote (fuzzy tiers + rerouted exact hits).
      if (normalizeFeatureSlug(match.candidate.feature.id) !== normalizeFeatureSlug(raw.id)) {
        remappedCount++;
      }

      const previous = match.candidate.feature;
      const merged = mergeFeature(previous, raw);
      const featureId = normalizeFeatureSlug(merged.id);
      match.candidate.feature = merged;
      indexFeatureCandidate(match.candidate, indexes);

      if (match.candidate.origin === 'new') {
        newFeaturesById.set(featureId, { ...merged, ...metadata });
      } else {
        const matchKey = getTypedFeatureKey(previous.type, normalizeFeatureSlug(previous.id));
        if (!discoveredSet.has(matchKey) || !isEqual(merged, previous)) {
          updatedFeaturesById.set(featureId, { ...merged, ...metadata });
        }
      }
    } else {
      const featureId = normalizeFeatureSlug(raw.id);
      const candidate: FeatureCandidate = { feature: raw, origin: 'new' };
      candidates.push(candidate);
      indexFeatureCandidate(candidate, indexes);
      newFeaturesById.set(featureId, { ...raw, ...metadata });
    }
  }

  return {
    newFeatures: Array.from(newFeaturesById.values()),
    updatedFeatures: Array.from(updatedFeaturesById.values()),
    codeIgnoredCount,
    remappedCount,
  };
}
