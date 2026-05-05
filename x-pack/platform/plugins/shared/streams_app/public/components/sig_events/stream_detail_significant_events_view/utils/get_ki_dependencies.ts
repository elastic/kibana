/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';

export const DEPENDENCY_FEATURE_TYPE = 'dependency';

/** A single resolved dependency relationship. */
export interface KIDependencyRelation {
  /** The dependency-type KI that describes the edge (e.g. "checkout → payment"). */
  via: KnowledgeIndicator;
  /** The other KI in the relationship (the source or target). */
  ki: KnowledgeIndicator;
}

export interface KIDependencies {
  /** KIs that the current KI depends on (outgoing edges). */
  dependsOn: KIDependencyRelation[];
  /** KIs that depend on the current KI (incoming edges). */
  dependents: KIDependencyRelation[];
}

/**
 * Normalizes a service identifier for fuzzy matching between entity KIs and
 * dependency edge source/target values.
 *
 * The LLM stores short names in dependency properties (e.g. `"checkout"`,
 * `"payment"`) while entity KI ids use a kebab-case `-service` suffix
 * (e.g. `"checkout-service"`) and titles use title-case with " Service"
 * (e.g. `"Checkout Service"`).  Stripping the suffix and lowercasing both
 * sides makes exact-equality matching work across all three forms.
 */
export function normalizeServiceName(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[-\s]service$/, '')
    .trim();
}

/**
 * Finds a KI in `allKIs` by an identifier that may be an exact `id`, an exact
 * `title`, or a short service name that normalizes to either (e.g. `"checkout"`
 * matching `"checkout-service"` / `"Checkout Service"`).
 */
export function findKIByIdentifier(
  identifier: unknown,
  allKIs: KnowledgeIndicator[]
): KnowledgeIndicator | undefined {
  const identNorm = normalizeServiceName(identifier);
  return allKIs.find(
    (other) =>
      other.kind === 'feature' &&
      (other.feature.id === identifier ||
        other.feature.title === identifier ||
        normalizeServiceName(other.feature.id) === identNorm ||
        normalizeServiceName(other.feature.title) === identNorm)
  );
}

/**
 * Given a KI and the full list of KIs, resolves the dependency relationships.
 *
 * Dependency features have `type === "dependency"` and use their `properties`
 * to record `source` / `target` (or `from` / `to`) references to other feature
 * IDs or titles.  We match both conventions (exact and normalized) and fall
 * back to empty arrays when a referenced KI can't be found in the list.
 */
export function getKIDependencies(
  ki: KnowledgeIndicator,
  allKIs: KnowledgeIndicator[]
): KIDependencies {
  if (ki.kind !== 'feature') return { dependsOn: [], dependents: [] };

  const currentId = ki.feature.id;
  const currentTitle = ki.feature.title ?? '';
  const currentIdNorm = normalizeServiceName(currentId);
  const currentTitleNorm = normalizeServiceName(currentTitle);

  const depFeatures = allKIs.filter(
    (other): other is KnowledgeIndicator & { kind: 'feature' } =>
      other.kind === 'feature' && other.feature.type === DEPENDENCY_FEATURE_TYPE
  );

  const dependsOn: KIDependencyRelation[] = [];
  const dependents: KIDependencyRelation[] = [];

  const matchesCurrent = (v: unknown): boolean => {
    if (v === currentId || (currentTitle !== '' && v === currentTitle)) return true;
    const vNorm = normalizeServiceName(v);
    return vNorm === currentIdNorm || (currentTitleNorm !== '' && vNorm === currentTitleNorm);
  };

  const findKI = (identifier: unknown): KnowledgeIndicator | undefined =>
    findKIByIdentifier(identifier, allKIs);

  for (const depKI of depFeatures) {
    const props = (depKI.feature.properties ?? {}) as Record<string, unknown>;
    const source = props.source ?? props.from;
    const target = props.target ?? props.to;

    if (matchesCurrent(source)) {
      const targetKI = findKI(target);
      if (targetKI) dependsOn.push({ via: depKI, ki: targetKI });
    }

    if (matchesCurrent(target)) {
      const sourceKI = findKI(source);
      if (sourceKI) dependents.push({ via: depKI, ki: sourceKI });
    }
  }

  return { dependsOn, dependents };
}
