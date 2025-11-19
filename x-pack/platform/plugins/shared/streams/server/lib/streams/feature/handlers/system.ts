/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, FeatureType } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import objectHash from 'object-hash';
import { FeatureTypeHandler } from '../feature_type_handler';
import type { StoredFeature } from '../stored_feature';
import {
  STREAM_NAME,
  FEATURE_DESCRIPTION,
  FEATURE_FILTER,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_UUID,
} from '../fields';
import { IdentifyFeaturesOptions, identifySystemFeatures } from '@kbn/streams-ai';

export type SystemFeature = Feature & {
  filter: Condition;
};

export class SystemFeatureHandler extends FeatureTypeHandler<SystemFeature> {
  readonly type = 'system';

  fromStorage(stored: StoredFeature): SystemFeature {
    return {
      type: stored[FEATURE_TYPE] as FeatureType,
      name: stored[FEATURE_NAME],
      description: stored[FEATURE_DESCRIPTION],
      filter: stored[FEATURE_FILTER]!,
    };
  }

  toStorage(streamName: string, feature: SystemFeature): StoredFeature {
    return {
      [STREAM_NAME]: streamName,
      [FEATURE_UUID]: this.getFeatureUuid(streamName, feature.name),
      [FEATURE_TYPE]: feature.type,
      [FEATURE_NAME]: feature.name,
      [FEATURE_DESCRIPTION]: feature.description,
      [FEATURE_FILTER]: feature.filter,
    };
  }

  identifyFeatures(options: IdentifyFeaturesOptions): Promise<{ features: SystemFeature[] }> {
    return identifySystemFeatures({ ...options, dropUnmapped: true });
  }

  getFeatureUuid(streamName: string, featureName: string): string {
    // required for bwc
    return objectHash({
      [STREAM_NAME]: streamName,
      [FEATURE_NAME]: featureName,
    });
  }
}
