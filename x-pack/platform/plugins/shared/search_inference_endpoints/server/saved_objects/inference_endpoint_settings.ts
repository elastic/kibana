/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { INFERENCE_ENDPOINT_SETTINGS_SO_TYPE } from '../../common/constants';
import { inferenceEndpointSettingsSchemaV1 } from './schema/v1';

export const createInferenceEndpointSettingsSavedObjectType = (): SavedObjectsType => ({
  name: INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: inferenceEndpointSettingsSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: inferenceEndpointSettingsSchemaV1,
      },
    },
  },
});
