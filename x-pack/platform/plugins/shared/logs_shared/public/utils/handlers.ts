/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

export function callWithoutRepeats<T>(
  func: (...args: any[]) => T,
  isArgsEqual: (firstArgs: any, secondArgs: any) => boolean = isEqual
) {
  let previousArgs: any[];
  let previousResult: T;

  return (...args: any[]) => {
    if (!isArgsEqual(args, previousArgs)) {
      previousArgs = args;
      previousResult = func(...args);
    }

    return previousResult;
  };
}
