/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { asset } from './asset';
import { filtersFunctionFactory } from './filters';
import { timelion } from './timelion';
import { toFunctionFactory } from './to';

export interface InitializeArguments {
  typesRegistry: ExpressionsSetup['__LEGACY']['types'];
}

export function initFunctions(initialize: InitializeArguments) {
  return [asset, filtersFunctionFactory(initialize), timelion, toFunctionFactory(initialize)];
}
