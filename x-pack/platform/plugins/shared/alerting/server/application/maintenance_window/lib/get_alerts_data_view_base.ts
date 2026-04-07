/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

const ES_TYPE_TO_KBN_TYPE: Record<string, string> = {
  keyword: 'string',
  text: 'string',
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
  half_float: 'number',
  scaled_float: 'number',
  date: 'date',
  date_range: 'date_range',
  boolean: 'boolean',
  flattened: 'string',
  version: 'string',
  unmapped: 'string',
};

export function getAlertsDataViewBase(): DataViewBase {
  const fields: DataViewFieldBase[] = Object.entries(alertFieldMap).map(([name, def]) => ({
    name,
    type: ES_TYPE_TO_KBN_TYPE[def.type] ?? def.type,
    esTypes: [def.type],
    scripted: false,
  }));

  return { title: '.alerts-*', fields };
}
