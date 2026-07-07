/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunction } from '@kbn/expressions-plugin/common';
import { initFunctions } from '../public/functions';
import { functions as browserFns } from '../canvas_plugin_src/functions/browser';

export const functionSpecs = browserFns
  .concat(...(initFunctions({} as any) as any))
  .map((fn) => new ExpressionFunction(fn()));
