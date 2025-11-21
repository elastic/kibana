/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfrastructureFeature } from '@kbn/streams-schema';
import { identifyInfrastructureFeatures, type IdentifyFeaturesOptions } from '@kbn/streams-ai';
import { FeatureTypeHandler } from '../feature_type_handler';
import type { StoredFeature } from '../stored_feature';
import {
  STREAM_NAME,
  FEATURE_DESCRIPTION,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_UUID,
  FEATURE_META,
} from '../fields';

export class InfrastructureFeatureHandler extends FeatureTypeHandler<InfrastructureFeature> {
  readonly type = 'infrastructure';

  fromStorage(stored: StoredFeature): InfrastructureFeature {
    return {
      type: stored[FEATURE_TYPE] as 'infrastructure',
      name: stored[FEATURE_NAME],
      description: stored[FEATURE_DESCRIPTION],
      provider: stored[FEATURE_META]?.provider as string,
    };
  }

  toStorage(streamName: string, feature: InfrastructureFeature): StoredFeature {
    return {
      [STREAM_NAME]: streamName,
      [FEATURE_UUID]: this.getFeatureUuid(streamName, feature.name),
      [FEATURE_TYPE]: feature.type,
      [FEATURE_NAME]: feature.name,
      [FEATURE_DESCRIPTION]: feature.description,
      [FEATURE_META]: feature.provider ? { provider: feature.provider } : undefined,
    };
  }

  identifyFeatures(
    options: IdentifyFeaturesOptions
  ): Promise<{ features: InfrastructureFeature[] }> {
    return identifyInfrastructureFeatures({ ...options, dropUnmapped: false });
  }
}
