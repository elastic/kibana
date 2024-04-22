/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';

const deleteSLOInstancesParamsSchema = t.type({
  body: t.type({ list: t.array(t.type({ sloId: sloIdSchema, instanceId: t.string })) }),
});

type DeleteSLOInstancesInput = t.OutputOf<typeof deleteSLOInstancesParamsSchema.props.body>;
type DeleteSLOInstancesParams = t.TypeOf<typeof deleteSLOInstancesParamsSchema.props.body>;

export { deleteSLOInstancesParamsSchema };
export type { DeleteSLOInstancesInput, DeleteSLOInstancesParams };
