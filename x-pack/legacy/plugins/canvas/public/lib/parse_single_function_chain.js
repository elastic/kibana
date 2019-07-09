/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, mapValues, map } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';

export function parseSingleFunctionChain(filterString) {
  const ast = fromExpression(filterString);

  // Check if the current column is what we expect it to be. If the user changes column this will be called again,
  // but we don't want to run setFilter() unless we have to because it will cause a data refresh
  const name = get(ast, 'chain[0].function');
  if (!name) {
    throw new Error('Could not find function name in chain');
  }

  const args = mapValues(get(ast, 'chain[0].arguments'), val => {
    // TODO Check for literals only
    return map(val, 'value');
  });

  return { name, args };
}
