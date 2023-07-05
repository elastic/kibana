/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
  VALIDATION_RESULT,
} from '../constants/categorization';

export interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

export type CategorizationAnalyzer = estypes.MlCategorizationAnalyzerDefinition & {
  analyzer?: string;
};

export interface CategoryFieldExample {
  text: string;
  tokens: Token[];
}

export interface FieldExampleCheck {
  id: VALIDATION_RESULT;
  valid: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  message: string;
}
