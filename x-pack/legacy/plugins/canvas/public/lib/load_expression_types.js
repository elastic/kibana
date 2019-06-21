/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { argTypeSpecs } from '../expression_types/arg_types';
import { datasourceSpecs } from '../expression_types/datasources';
import { argTypeRegistry, datasourceRegistry } from '../expression_types';

// register default args, arg types, and expression types
argTypeSpecs.forEach(expFn => argTypeRegistry.register(expFn));
datasourceSpecs.forEach(expFn => datasourceRegistry.register(expFn));
