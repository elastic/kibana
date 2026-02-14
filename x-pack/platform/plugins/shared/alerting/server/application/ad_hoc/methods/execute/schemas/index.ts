/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { executeParamsSchema } from './execute_params_schema';
import type { executeResultSchema } from './execute_result_schema';

export type ExecuteParams = TypeOf<typeof executeParamsSchema>;
export type ExecuteResult = TypeOf<typeof executeResultSchema>;
