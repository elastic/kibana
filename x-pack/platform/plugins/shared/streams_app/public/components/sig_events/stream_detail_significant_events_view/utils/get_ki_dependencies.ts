/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';

export const DEPENDENCY_FEATURE_TYPE = 'dependency';

export interface KIDependencyRelation {
  via: KnowledgeIndicator;
  ki: KnowledgeIndicator;
}

export interface KIDependencies {
  dependsOn: KIDependencyRelation[];
  dependents: KIDependencyRelation[];
}

export function normalizeServiceName(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[-\s]service$/, '')
    .trim();
}

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
