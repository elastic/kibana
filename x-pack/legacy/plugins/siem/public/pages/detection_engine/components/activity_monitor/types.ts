/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RuleTypes {
  href: string;
  name: string;
}

export interface ColumnTypes {
  id: number;
  rule: RuleTypes;
  ran: string;
  lookedBackTo: string;
  status: string;
  response?: string | undefined;
}

export interface PageTypes {
  index: number;
  size: number;
}

export interface SortTypes {
  field: keyof ColumnTypes;
  direction: 'asc' | 'desc';
}
