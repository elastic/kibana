/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import ci from './ci.json';
import { DemoRows } from './demo_rows_types';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import shirts from './shirts.json';
import { getFunctionErrors } from '../../../../i18n';

export function getDemoRows(arg: string | null) {
  if (arg === DemoRows.CI) {
    return cloneDeep(ci);
  }
  if (arg === DemoRows.SHIRTS) {
    return cloneDeep(shirts);
  }
  throw getFunctionErrors().demodata.invalidDataSet(arg);
}
