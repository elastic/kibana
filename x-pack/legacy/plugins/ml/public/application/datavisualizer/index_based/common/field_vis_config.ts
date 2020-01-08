/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_JOB_FIELD_TYPES } from '../../../../../common/constants/field_types';

// The internal representation of the configuration used to build the visuals
// which display the field information.
// TODO - type stats
export interface FieldVisConfig {
  type: ML_JOB_FIELD_TYPES;
  fieldName?: string;
  existsInDocs: boolean;
  aggregatable: boolean;
  loading: boolean;
  stats?: any;
  fieldFormat?: any;
  isUnsupportedType?: boolean;
}
