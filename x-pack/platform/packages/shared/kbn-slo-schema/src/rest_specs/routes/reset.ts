/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloDefinitionSchema, sloIdSchema } from '../../schema/slo';

const resetSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const resetSLOResponseSchema = sloDefinitionSchema;

type ResetSLOParams = t.TypeOf<typeof resetSLOParamsSchema.props.path>;
type ResetSLOResponse = t.OutputOf<typeof resetSLOResponseSchema>;

export { resetSLOParamsSchema, resetSLOResponseSchema };
export type { ResetSLOParams, ResetSLOResponse };
