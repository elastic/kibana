/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, FeatureType } from '@kbn/streams-schema';
import objectHash from 'object-hash';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { IdentifyFeaturesOptions } from '@kbn/streams-ai';
import { FEATURE_TYPE, FEATURE_NAME, STREAM_NAME, FEATURE_VALUE } from './fields';
import type { StoredFeature } from './stored_feature';

export abstract class FeatureTypeHandler<T extends Feature = Feature> {
  abstract readonly type: T['type'];

  abstract fromStorage(stored: StoredFeature): T;
  abstract toStorage(streamName: string, feature: T): StoredFeature;

  abstract identifyFeatures(
    options: IdentifyFeaturesOptions
  ): Promise<{ features: T[]; tokensUsed: ChatCompletionTokenCount }>;

  public getFeatureUuid(
    streamName: string,
    feature: { type: FeatureType; name: string; value: string }
  ): string {
    return objectHash({
      [FEATURE_TYPE]: feature.type,
      [STREAM_NAME]: streamName,
      [FEATURE_NAME]: feature.name,
      [FEATURE_VALUE]: feature.value,
    });
  }
}
