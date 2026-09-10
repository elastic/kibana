/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';

export const PLUGIN_ID = 'automaticImport';
export const PLUGIN_NAME = 'Automatic Import';

export const AUTOMATIC_IMPORT_INFERENCE_FEATURE_ID = 'automatic_import';
export const AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID = 'automatic_import_parent';

export const MINIMUM_LICENSE_TYPE: LicenseType = 'enterprise';

export const MAX_STRING_LENGTH = {
  // Generic categories
  identifier: 256,
  name: 512,
  description: 10_000,
  search_query: 1_024,
  body: 100_000,
  url: 4_096,

  uuid: 36,
  semver: 20,
  es_index_name: 255,
  ecs_field_path: 256,
  field_mapping_path: 512,
};
