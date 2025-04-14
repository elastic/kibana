/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimelineDetailsQuery } from './query.events_details.dsl';

describe('buildTimelineDetailsQuery', () => {
  it('returns the expected query', () => {
    const indexName = '.siem-signals-default';
    const eventId = 'f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3';

    const query = buildTimelineDetailsQuery({
      indexName,
      id: eventId,
      runtimeMappings: {},
    });

    expect(query).toMatchInlineSnapshot(`
      Object {
        "allow_no_indices": true,
        "body": Object {
          "_source": true,
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": true,
            },
            Object {
              "field": "@timestamp",
              "format": "strict_date_optional_time",
            },
            Object {
              "field": "code_signature.timestamp",
              "format": "strict_date_optional_time",
            },
            Object {
              "field": "dll.code_signature.timestamp",
              "format": "strict_date_optional_time",
            },
          ],
          "query": Object {
            "terms": Object {
              "_id": Array [
                "f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3",
              ],
            },
          },
          "runtime_mappings": Object {},
          "stored_fields": Array [
            "*",
          ],
        },
        "ignore_unavailable": true,
        "index": ".siem-signals-default",
        "size": 1,
      }
    `);
  });
});
