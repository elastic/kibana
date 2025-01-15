/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { CollapseArgs } from '.';

export type CollapseExpressionFunction = ExpressionFunctionDefinition<
  'lens_collapse',
  Datatable,
  CollapseArgs,
  Datatable | Promise<Datatable>
>;
