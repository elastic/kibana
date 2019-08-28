/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

export function context(): ExpressionFunction<'context', any, {}, any> {
  const { help } = getFunctionHelp().context;

  return {
    name: 'context',
    help,
    args: {},
    fn: obj => obj,
  };
}
