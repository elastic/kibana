/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import { extractPropertiesFromBucket } from '../../../../common/elasticsearch_util';

const KEYS_TO_IGNORE = ['key', 'path'];

export function convertToGeoJson(esResponse: any, entitySplitFieldName: string) {
  const features: Feature[] = [];
  let numTrimmedTracks = 0;

  const buckets = _.get(esResponse, 'aggregations.tracks.buckets', {});
  const entityKeys = Object.keys(buckets);
  for (let i = 0; i < entityKeys.length; i++) {
    const entityKey = entityKeys[i];
    const bucket = buckets[entityKey];
    const feature = {
      ...(bucket.path as Feature),
    };
    if (!feature.properties!.complete) {
      numTrimmedTracks++;
    }
    feature.id = entityKey;
    feature.properties = {
      [entitySplitFieldName]: entityKey,
      ...feature.properties,
      ...extractPropertiesFromBucket(bucket, KEYS_TO_IGNORE),
    };
    features.push(feature);
  }

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features,
    } as FeatureCollection,
    numTrimmedTracks,
  };
}
