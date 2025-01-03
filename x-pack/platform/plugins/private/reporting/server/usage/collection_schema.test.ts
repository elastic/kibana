/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingSchema } from './collection_schema';

describe('Reporting telemetry collection schema', () => {
  test('fields', () => {
    expect(ReportingSchema).toMatchInlineSnapshot(`
      Object {
        "available": Object {
          "type": "boolean",
        },
        "enabled": Object {
          "type": "boolean",
        },
      }
    `);
  });
});
