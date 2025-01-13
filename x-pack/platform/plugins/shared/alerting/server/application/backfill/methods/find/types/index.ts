/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { findBackfillQuerySchema, findBackfillResultSchema } from '../schemas';

export type FindBackfillParams = TypeOf<typeof findBackfillQuerySchema>;
export type FindBackfillResult = TypeOf<typeof findBackfillResultSchema>;
