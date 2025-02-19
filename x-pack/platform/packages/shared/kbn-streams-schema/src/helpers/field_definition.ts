/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { FieldDefinitionConfig } from '../models';

// Parameters that we consider first class and provide a curated experience for
const FIRST_CLASS_PARAMETERS = ['type', 'format'];

// Advanced parameters that we provide a generic experience (JSON blob) for
export const getAdvancedParameters = (fieldName: string, fieldConfig: FieldDefinitionConfig) => {
  // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
  const additionalOmissions = fieldName === '@timestamp' ? ['ignore_malformed'] : [];
  return omit(fieldConfig, FIRST_CLASS_PARAMETERS.concat(additionalOmissions));
};
