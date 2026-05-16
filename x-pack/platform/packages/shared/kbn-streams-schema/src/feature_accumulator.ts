/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDuplicateFeature, type BaseFeature, type Feature } from './feature';

export class FeatureAccumulator {
  private readonly byId = new Map<string, Feature>();
  private readonly byLowerId = new Map<string, Feature>();
  private readonly fromStorage = new Set<string>();

  constructor(initialFeatures: Feature[] = []) {
    for (const f of initialFeatures) {
      this.add(f);
      this.fromStorage.add(f.id);
    }
  }

  add(feature: Feature) {
    this.byId.set(feature.id, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  update(feature: Feature) {
    if (!this.byId.has(feature.id)) {
      return;
    }
    this.byId.set(feature.id, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  findDuplicate(candidate: BaseFeature): Feature | undefined {
    return (
      this.byLowerId.get(candidate.id.toLowerCase()) ??
      this.getAll().find((f) => isDuplicateFeature(f, candidate))
    );
  }

  isStoredFeature(feature: Feature): boolean {
    return this.fromStorage.has(feature.id);
  }

  promoteFromStorage(featureId: string) {
    this.fromStorage.delete(featureId);
  }

  getAll(): Feature[] {
    return Array.from(this.byId.values());
  }

  getDiscovered(): Feature[] {
    return this.getAll().filter((f) => !this.fromStorage.has(f.id));
  }

  getTopRanked(limit: number): Feature[] {
    return this.getAll()
      .sort((a, b) => {
        const aEntity = a.type === 'entity' ? 0 : 1;
        const bEntity = b.type === 'entity' ? 0 : 1;
        if (aEntity !== bEntity) return aEntity - bEntity;
        return b.confidence - a.confidence;
      })
      .slice(0, limit);
  }

  public get length(): number {
    return this.byId.size;
  }
}
