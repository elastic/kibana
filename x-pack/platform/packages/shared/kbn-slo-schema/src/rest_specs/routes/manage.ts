/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';

const manageSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;

export { manageSLOParamsSchema };
export type { ManageSLOParams };
