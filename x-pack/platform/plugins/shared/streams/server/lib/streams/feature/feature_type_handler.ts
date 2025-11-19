/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import type { IdentifyFeaturesOptions } from '@kbn/streams-ai';
import objectHash from 'object-hash';
import { FEATURE_TYPE, FEATURE_NAME, STREAM_NAME } from './fields';
import type { StoredFeature } from './stored_feature';

/**
 * Interface for handling encoding/decoding of specific feature types
 */
export abstract class FeatureTypeHandler<T extends Feature = Feature> {
  abstract readonly type: string;

  abstract fromStorage(stored: StoredFeature): T;
  abstract toStorage(streamName: string, feature: T): StoredFeature;
  abstract identifyFeatures(options: IdentifyFeaturesOptions): Promise<{ features: T[] }>;

  public getFeatureUuid(streamName: string, featureName: string): string {
    return objectHash({
      [FEATURE_TYPE]: this.type,
      [STREAM_NAME]: streamName,
      [FEATURE_NAME]: featureName,
    });
  }
}
