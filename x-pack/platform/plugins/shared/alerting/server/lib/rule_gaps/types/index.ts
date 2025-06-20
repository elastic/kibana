/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  gapBaseSchema,
  findGapsParamsSchema,
  findGapsByIdParamsSchema,
  findGapsSearchAfterParamsSchema,
} from '../schemas';

export type GapBase = TypeOf<typeof gapBaseSchema>;
export type FindGapsParams = TypeOf<typeof findGapsParamsSchema>;
export type FindGapsSearchAfterParams = TypeOf<typeof findGapsSearchAfterParamsSchema>;
export type FindGapsByIdParams = TypeOf<typeof findGapsByIdParamsSchema>;

export interface Interval {
  gte: Date;
  lte: Date;
}

export interface StringInterval {
  gte: string;
  lte: string;
}
