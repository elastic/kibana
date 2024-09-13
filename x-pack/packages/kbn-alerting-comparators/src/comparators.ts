/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}
export enum COMPARATORS {
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUALS = '>=',
  BETWEEN = 'between',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUALS = '<=',
  NOT_BETWEEN = 'notBetween',
}
