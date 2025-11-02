/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const transformHealthSchema = t.union([
  t.literal('healthy'),
  t.literal('unhealthy'),
  t.literal('missing'),
]);

const healthStatusSchema = t.intersection([
  t.partial({
    transformState: t.union([t.literal('stopped'), t.literal('started')]),
  }),
  t.type({
    status: transformHealthSchema,
  }),
]);

const stateSchema = t.union([
  t.literal('no_data'),
  t.literal('indexing'),
  t.literal('running'),
  t.literal('stale'),
]);

export { transformHealthSchema, healthStatusSchema, stateSchema };
