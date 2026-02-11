/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FieldType = {
  INPUT_TEXT: 'INPUT_TEXT',
  INPUT_NUMBER: 'INPUT_NUMBER',
  SELECT_BASIC: 'SELECT_BASIC',
  TEXTAREA: 'TEXTAREA',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const fieldTypesArray = Object.keys(FieldType) as FieldType[];
