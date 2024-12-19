/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TileMetaFeature } from '../../../common/descriptor_types';

// Elasticsearch vector tile API returns "meta" layer containing a single metadata feature for each tile request
// This file contains utility methods for pulling values out of metadata features
// Placing logic in a single file to provide a centrialize location and avoid scattering logic throughout plugin

export const ES_MVT_META_LAYER_NAME = 'meta';
export const ES_MVT_HITS_TOTAL_RELATION = 'hits.total.relation';
export const ES_MVT_HITS_TOTAL_VALUE = 'hits.total.value';

export function getAggsMeta(metaFeatures: TileMetaFeature[]): { docCount: number } {
  let docCount = 0;
  metaFeatures.forEach((metaFeature) => {
    const count = metaFeature.properties
      ? (metaFeature.properties['aggregations._count.sum'] as number)
      : 0;
    if (count > 0) {
      docCount += count;
    }
  });

  return { docCount };
}

export function getHitsMeta(
  metaFeatures: TileMetaFeature[],
  maxResultWindow: number
): { totalFeaturesCount: number; tilesWithFeatures: number; tilesWithTrimmedResults: number } {
  let totalFeaturesCount = 0;
  let tilesWithFeatures = 0;
  let tilesWithTrimmedResults = 0;
  metaFeatures.forEach((metaFeature) => {
    const count = metaFeature.properties ? metaFeature.properties[ES_MVT_HITS_TOTAL_VALUE] : 0;
    if (count > 0) {
      totalFeaturesCount += count;
      tilesWithFeatures++;
    }

    if (
      metaFeature?.properties?.[ES_MVT_HITS_TOTAL_RELATION] === 'gte' &&
      metaFeature?.properties?.[ES_MVT_HITS_TOTAL_VALUE] >= maxResultWindow + 1
    ) {
      tilesWithTrimmedResults++;
    }
  });
  return { totalFeaturesCount, tilesWithFeatures, tilesWithTrimmedResults };
}

export function getAggRange(
  metaFeature: TileMetaFeature,
  subAggName: string
): { min: number; max: number } | null {
  const minField = `aggregations.${subAggName}.min`;
  const maxField = `aggregations.${subAggName}.max`;
  return metaFeature.properties &&
    typeof metaFeature.properties[minField] === 'number' &&
    typeof metaFeature.properties[maxField] === 'number'
    ? {
        min: metaFeature.properties[minField] as number,
        max: metaFeature.properties[maxField] as number,
      }
    : null;
}

export function hasIncompleteResults(tileMetaFeature: TileMetaFeature) {
  if (
    typeof tileMetaFeature.properties?.timed_out === 'boolean' &&
    tileMetaFeature.properties.timed_out
  ) {
    return true;
  }

  if (
    typeof tileMetaFeature.properties?.['_shards.failed'] === 'number' &&
    tileMetaFeature.properties['_shards.failed'] > 0
  ) {
    return true;
  }

  if (
    typeof tileMetaFeature.properties?.['_clusters.skipped'] === 'number' &&
    tileMetaFeature.properties['_clusters.skipped'] > 0
  ) {
    return true;
  }

  if (
    typeof tileMetaFeature.properties?.['_clusters.partial'] === 'number' &&
    tileMetaFeature.properties['_clusters.partial'] > 0
  ) {
    return true;
  }

  return false;
}
