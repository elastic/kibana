/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject } from 'lodash';

export function deepFreeze(object) {
  // for any properties that reference an object, makes sure that object is
  // recursively frozen as well
  Object.keys(object).forEach(key => {
    const value = object[key];
    if (isObject(value)) {
      deepFreeze(value);
    }
  });

  return Object.freeze(object);
}
