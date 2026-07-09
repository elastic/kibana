/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';

export const saveApmServerSchemaRoute = defineRoute<void>()({
  endpoint: 'POST /api/apm/fleet/apm_server_schema 2023-10-31',
  params: t.type({
    body: t.type({
      schema: t.record(t.string, t.unknown),
    }),
  }),
});
