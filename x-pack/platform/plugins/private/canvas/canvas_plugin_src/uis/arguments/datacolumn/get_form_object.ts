/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@kbn/tinymath';
import { unquoteString } from '../../../../common/lib/unquote_string';

// break out into separate function, write unit tests first
export function getFormObject(argValue: string) {
  if (argValue === '') {
    return {
      fn: '',
      column: '',
    };
  }

  // check if the value is a math expression, and set its type if it is
  const mathObj = parse(argValue);
  // A symbol node is a plain string, so we guess that they're looking for a column.
  if (typeof mathObj === 'number') {
    throw new Error(`Cannot render scalar values or complex math expressions`);
  }

  if (mathObj.type === 'variable') {
    return {
      fn: '',
      column: unquoteString(mathObj.value),
    };
  }

  // Check if its a simple function, eg a function wrapping a symbol node
  // check for only one arg of type string
  if (
    mathObj.type === 'function' &&
    mathObj.args.length === 1 &&
    typeof mathObj.args[0] !== 'number' &&
    mathObj.args[0].type === 'variable'
  ) {
    return {
      fn: mathObj.name,
      column: unquoteString(mathObj.args[0].value),
    };
  }

  // Screw it, textarea for you my fancy.
  throw new Error(`Cannot render scalar values or complex math expressions`);
}
