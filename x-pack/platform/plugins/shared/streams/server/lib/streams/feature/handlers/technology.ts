/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyFeature } from '@kbn/streams-schema';
import { identifyTechnologyFeatures, type IdentifyFeaturesOptions } from '@kbn/streams-ai';
import { FeatureTypeHandler } from '../feature_type_handler';
import type { StoredFeature } from '../stored_feature';
import {
  STREAM_NAME,
  FEATURE_DESCRIPTION,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_UUID,
} from '../fields';

export class TechnologyFeatureHandler extends FeatureTypeHandler<TechnologyFeature> {
  readonly type = 'technology';

  fromStorage(stored: StoredFeature): TechnologyFeature {
    return {
      type: stored[FEATURE_TYPE] as 'technology',
      name: stored[FEATURE_NAME],
      description: stored[FEATURE_DESCRIPTION],
    };
  }

  toStorage(streamName: string, feature: TechnologyFeature): StoredFeature {
    return {
      [STREAM_NAME]: streamName,
      [FEATURE_UUID]: this.getFeatureUuid(streamName, feature.name),
      [FEATURE_TYPE]: feature.type,
      [FEATURE_NAME]: feature.name,
      [FEATURE_DESCRIPTION]: feature.description,
    };
  }

  identifyFeatures(options: IdentifyFeaturesOptions): Promise<{ features: TechnologyFeature[] }> {
    return identifyTechnologyFeatures({ ...options, dropUnmapped: false });
  }
}
