/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const refreshSLOHealthParamsSchema = t.partial({
  query: t.type({}),
});

const refreshSLOHealthResponseSchema = t.type({
  processed: t.number,
});

export type RefreshSLOHealthParams = t.TypeOf<typeof refreshSLOHealthParamsSchema.props.query>;
export type RefreshSLOHealthResponse = t.OutputOf<typeof refreshSLOHealthResponseSchema>;

export { refreshSLOHealthParamsSchema, refreshSLOHealthResponseSchema };
