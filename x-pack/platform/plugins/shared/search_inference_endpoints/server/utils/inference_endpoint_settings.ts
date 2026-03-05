/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  InferenceEndpointSettingsAttributes,
  InferenceEndpointSettingsResponse,
} from '../../common/types';

export const parseInferenceEndpointSettingsSO = (
  so: SavedObject<InferenceEndpointSettingsAttributes>
): InferenceEndpointSettingsResponse => {
  const { id, created_at: createdAt, updated_at: updatedAt, attributes } = so;

  return {
    _meta: {
      id,
      createdAt,
      updatedAt,
    },
    data: attributes,
  };
};

export const validateInferenceEndpointSettings = (
  attrs: InferenceEndpointSettingsAttributes
): string[] => {
  const errors: string[] = [];

  const featureIds = attrs.features.map((f) => f.feature_id);
  const duplicateFeatureIds = featureIds.filter((id, index) => featureIds.indexOf(id) !== index);
  if (duplicateFeatureIds.length > 0) {
    errors.push(`Duplicate feature_id values: ${[...new Set(duplicateFeatureIds)].join(', ')}`);
  }

  for (const feature of attrs.features) {
    const duplicateEndpointIds = feature.endpoint_ids.filter(
      (id, index) => feature.endpoint_ids.indexOf(id) !== index
    );
    if (duplicateEndpointIds.length > 0) {
      errors.push(
        `Duplicate endpoint_ids in feature "${feature.feature_id}": ${[
          ...new Set(duplicateEndpointIds),
        ].join(', ')}`
      );
    }
  }

  return errors;
};
