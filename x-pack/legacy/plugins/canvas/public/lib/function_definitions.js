/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uniqBy from 'lodash.uniqby';
import { npStart } from 'ui/new_platform';
import { getServerFunctions } from '../state/selectors/app';

export async function getFunctionDefinitions(state) {
  const serverFunctions = getServerFunctions(state);
  return uniqBy(
    serverFunctions.concat(Object.values(npStart.plugins.expressions.getFunctions())),
    'name'
  );
}
