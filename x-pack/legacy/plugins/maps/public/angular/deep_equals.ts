/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Does a deep equality check, but insures undefined properties are equivalent to empty strings
 * This occurs when editing string properties (such as label, custom label, ...) and x-ing them out
 */
export function deepEquals(object1: any, object2: any, doubleCheck: boolean = true): boolean {
  for (const key: string in object1) {
    if (object1.hasOwnProperty(key)) {
      const value1: any = object1[key];
      const value2: any = object2[key];
      if (typeof value1 === 'undefined' || value1 === '') {
        // need to handle empty strings
        if (typeof value2 !== 'undefined' || value2 !== '') {
          return false;
        }
      } else if (value1 === null) {
        if (value2 !== null) {
          return false;
        }
      } else if (typeof value1 === 'object') {
        if (!deepEquals(value1, value2, doubleCheck)) {
          return false;
        }
      } else {
        if (value1 !== value2) {
          return false;
        }
      }
    }
  }

  if (doubleCheck) {
    return deepEquals(object2, object1, false);
  } else {
    return true;
  }
}
