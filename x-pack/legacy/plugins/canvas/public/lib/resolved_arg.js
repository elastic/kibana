/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export function getState(resolvedArg) {
  return get(resolvedArg, 'state', null);
}

export function getValue(resolvedArg) {
  return get(resolvedArg, 'value', null);
}

export function getError(resolvedArg) {
  if (getState(resolvedArg) !== 'error') {
    return null;
  }
  return get(resolvedArg, 'error', null);
}
