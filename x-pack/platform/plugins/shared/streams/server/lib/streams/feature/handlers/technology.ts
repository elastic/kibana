/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyFeature } from '@kbn/streams-schema';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StoredFeature } from '../stored_feature';
import {
  FEATURE_NAME,
  FEATURE_VALUE,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_UUID,
  FEATURE_TYPE,
  STREAM_NAME,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
} from '../fields';
import { FeatureTypeHandler } from '../feature_type_handler';
import { identifyFeatures, IdentifyFeaturesOptions } from '@kbn/streams-ai';

export class TechnologyFeatureHandler extends FeatureTypeHandler<TechnologyFeature> {
  type = 'technology' as const;

  fromStorage(stored: StoredFeature): TechnologyFeature {
    return {
      type: this.type,
      name: stored[FEATURE_NAME],
      value: stored[FEATURE_VALUE],
      confidence: stored[FEATURE_CONFIDENCE],
      evidence: stored[FEATURE_EVIDENCE],
      status: stored[FEATURE_STATUS],
      last_seen: stored[FEATURE_LAST_SEEN],
    };
  }

  toStorage(streamName: string, feature: TechnologyFeature): StoredFeature {
    return {
      [FEATURE_UUID]: this.getFeatureUuid(streamName, feature),
      [FEATURE_TYPE]: feature.type,
      [STREAM_NAME]: streamName,
      [FEATURE_NAME]: feature.name,
      [FEATURE_VALUE]: feature.value,
      [FEATURE_CONFIDENCE]: feature.confidence,
      [FEATURE_EVIDENCE]: feature.evidence,
      [FEATURE_STATUS]: feature.status,
      [FEATURE_LAST_SEEN]: feature.last_seen,
    };
  }

  identifyFeatures(
    options: IdentifyFeaturesOptions
  ): Promise<{ features: TechnologyFeature[]; tokensUsed: ChatCompletionTokenCount }> {
    return identifyFeatures<TechnologyFeature>({ ...options, featureType: this.type });
  }
}
