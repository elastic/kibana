/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

export type ValidNormalizedTypes = `${Exclude<
  KBN_FIELD_TYPES,
  | KBN_FIELD_TYPES.UNKNOWN
  | KBN_FIELD_TYPES.MISSING
  | KBN_FIELD_TYPES._SOURCE
  | KBN_FIELD_TYPES.ATTACHMENT
  | KBN_FIELD_TYPES.CONFLICT
  | KBN_FIELD_TYPES.NESTED
>}`;

export interface AggregationType {
  text: string;
  fieldRequired: boolean;
  value: string;
  validNormalizedTypes: ValidNormalizedTypes[];
}

export interface GroupByType {
  text: string;
  sizeRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}

export interface FieldOption {
  name: string;
  type: string;
  normalizedType: string;
  searchable: boolean;
  aggregatable: boolean;
}

export type { RuleStatus } from '../types';
