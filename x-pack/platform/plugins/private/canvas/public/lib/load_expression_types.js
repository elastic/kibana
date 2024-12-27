/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { argTypeSpecs } from '../expression_types/arg_types';
import { argTypeRegistry } from '../expression_types';

export function loadExpressionTypes() {
  // register default args, arg types, and expression types
  argTypeSpecs.forEach((expFn) => argTypeRegistry.register(expFn));
}
