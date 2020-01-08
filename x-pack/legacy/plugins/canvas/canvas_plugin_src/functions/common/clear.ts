/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

export function clear(): ExpressionFunction<'clear', any, {}, null> {
  const { help } = getFunctionHelp().clear;

  return {
    name: 'clear',
    type: 'null',
    help,
    context: {
      types: ['null'],
    },
    args: {},
    fn: () => null,
  };
}
