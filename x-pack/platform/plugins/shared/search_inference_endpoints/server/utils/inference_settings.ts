/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { InferenceSettingsAttributes, InferenceSettingsResponse } from '../../common/types';

export const parseInferenceSettingsSO = (
  so: SavedObject<InferenceSettingsAttributes>
): InferenceSettingsResponse => {
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

export const validateInferenceSettings = (attrs: InferenceSettingsAttributes): string[] => {
  const errors: string[] = [];

  const featureIds = attrs.features.map((f) => f.feature_id);
  const duplicateFeatureIds = featureIds.filter((id, index) => featureIds.indexOf(id) !== index);
  if (duplicateFeatureIds.length > 0) {
    errors.push(
      i18n.translate('xpack.searchInferenceEndpoints.settings.duplicateFeatureIds', {
        defaultMessage: 'Duplicate feature_id values: {ids}',
        values: { ids: [...new Set(duplicateFeatureIds)].join(', ') },
      })
    );
  }

  for (const feature of attrs.features) {
    const endpointIds = feature.endpoints.map((e) => e.id);
    const duplicateEndpointIds = endpointIds.filter(
      (id, index) => endpointIds.indexOf(id) !== index
    );
    if (duplicateEndpointIds.length > 0) {
      errors.push(
        i18n.translate('xpack.searchInferenceEndpoints.settings.duplicateEndpoints', {
          defaultMessage: 'Duplicate endpoints in feature "{featureId}": {ids}',
          values: {
            featureId: feature.feature_id,
            ids: [...new Set(duplicateEndpointIds)].join(', '),
          },
        })
      );
    }
  }

  return errors;
};
