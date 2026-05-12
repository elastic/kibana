/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * IMPORTANT: Any changes to this file must be carefully checked against both usage
 * from the SLO definitions API and the SLO Health API, as both depend on these shared types.
 * One is a public API, the other is an internal API.
 * If types need to diverge, they should be split into separate files.
 */

const transformHealthSchema = t.intersection([
  t.type({
    isProblematic: t.boolean,
    missing: t.boolean,
    status: t.union([t.literal('healthy'), t.literal('unhealthy'), t.literal('unavailable')]),
    state: t.union([
      t.literal('stopped'),
      t.literal('started'),
      t.literal('stopping'),
      t.literal('aborting'),
      t.literal('failed'),
      t.literal('indexing'),
      t.literal('unavailable'),
    ]),
  }),
  t.partial({
    stateMatches: t.boolean,
  }),
]);

export type TransformHealthResponse = t.OutputOf<typeof transformHealthSchema>;
export { transformHealthSchema };
