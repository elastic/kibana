/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { getRuleIdsWithGapsParamsSchema, getRuleIdsWithGapsResponseSchema } from '../schemas';

export type GetRuleIdsWithGapsParams = TypeOf<typeof getRuleIdsWithGapsParamsSchema>;
export type GetRuleIdsWithGapsResponse = TypeOf<typeof getRuleIdsWithGapsResponseSchema>;
