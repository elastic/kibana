/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineBuilderType } from '../types';
import { generateThresholdQuery } from './generate_query';
import { thresholdBuilderFieldsSchema } from './schema';
import type { ThresholdBuilderFields } from './types';

export const THRESHOLD_BUILDER_TYPE = 'threshold';

export const thresholdBuilderTypeDefinition = defineBuilderType<ThresholdBuilderFields>({
  type: THRESHOLD_BUILDER_TYPE,
  builderFieldsSchema: thresholdBuilderFieldsSchema,
  generateQuery: generateThresholdQuery,
});
