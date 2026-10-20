/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { saveApmServerSchemaRoute } from './save_apm_server_schema';

describe('saveApmServerSchemaRoute params', () => {
  it('accepts an arbitrary schema record', () => {
    const result = saveApmServerSchemaRoute.params!.safeParse({
      body: { schema: { foo: 'bar', nested: { a: 1 } } },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing schema', () => {
    expectParseError(saveApmServerSchemaRoute.params!.safeParse({ body: {} }));
  });
});
