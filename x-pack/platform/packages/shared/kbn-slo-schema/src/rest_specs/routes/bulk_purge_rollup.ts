/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const bulkPurgeRollupSchema = t.type({
  body: t.type({
    ids: t.array(t.string),
    policy: t.string,
  }),
});

export { bulkPurgeRollupSchema };
