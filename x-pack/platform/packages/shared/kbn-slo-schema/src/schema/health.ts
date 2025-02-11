/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const healthStatusSchema = t.union([t.literal('healthy'), t.literal('unhealthy')]);
const stateSchema = t.union([
  t.literal('no_data'),
  t.literal('indexing'),
  t.literal('running'),
  t.literal('stale'),
]);

export { healthStatusSchema, stateSchema };
