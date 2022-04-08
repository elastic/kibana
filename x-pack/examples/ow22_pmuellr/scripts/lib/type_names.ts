/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EsTypesToTsTypes: Record<string, string> = {
  binary: 'string',
  date: 'string',
  flattened: 'object',
  keyword: 'string',
  nested: 'object',
  text: 'string',
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
};

export function esTypeToTsType(type: string): string {
  return EsTypesToTsTypes[type] || type;
}
