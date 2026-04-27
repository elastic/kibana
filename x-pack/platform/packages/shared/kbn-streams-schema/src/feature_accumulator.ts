/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDuplicateFeature, type BaseFeature, type Feature } from './feature';

export class FeatureAccumulator {
  private readonly byUuid = new Map<string, Feature>();
  private readonly byLowerId = new Map<string, Feature>();
  private readonly fromStorage = new Set<string>();

  constructor(initialFeatures: Feature[] = []) {
    for (const f of initialFeatures) {
      this.add(f);
      this.fromStorage.add(f.uuid);
    }
  }

  add(feature: Feature) {
    this.byUuid.set(feature.uuid, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  update(feature: Feature) {
    if (!this.byUuid.has(feature.uuid)) {
      return;
    }
    this.byUuid.set(feature.uuid, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  findDuplicate(candidate: BaseFeature): Feature | undefined {
    return (
      this.byLowerId.get(candidate.id.toLowerCase()) ??
      this.getAll().find((f) => isDuplicateFeature(f, candidate))
    );
  }

  isStoredFeature(feature: Feature): boolean {
    return this.fromStorage.has(feature.uuid);
  }

  promoteFromStorage(featureUuid: string) {
    this.fromStorage.delete(featureUuid);
  }

  getAll(): Feature[] {
    return Array.from(this.byUuid.values());
  }

  getDiscovered(): Feature[] {
    return this.getAll().filter((f) => !this.fromStorage.has(f.uuid));
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
    return this.byUuid.size;
  }
}
