/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

export function isDifferent(val1: any, val2: any) {
  if (
    (val1 === null || typeof val1 === 'undefined') &&
    (val2 === null || typeof val2 === 'undefined')
  ) {
    return false;
  }

  return !isEqual(val1, val2);
}
