/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DownsampleArgs } from '.';

export type DownsampleExpressionFunction = ExpressionFunctionDefinition<
  'lens_downsample',
  Datatable,
  DownsampleArgs,
  Datatable | Promise<Datatable>
>;
