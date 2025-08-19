/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1, modelVersion2, modelVersion3 } from '.';

describe('Model versions', () => {
  describe('version 1', () => {
    it('returns version 1 changes correctly', () => {
      expect(modelVersion1.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "customFields": Object {
                "properties": Object {
                  "key": Object {
                    "type": "keyword",
                  },
                  "type": Object {
                    "type": "keyword",
                  },
                  "value": Object {
                    "fields": Object {
                      "boolean": Object {
                        "ignore_malformed": true,
                        "type": "boolean",
                      },
                      "date": Object {
                        "ignore_malformed": true,
                        "type": "date",
                      },
                      "ip": Object {
                        "ignore_malformed": true,
                        "type": "ip",
                      },
                      "number": Object {
                        "ignore_malformed": true,
                        "type": "long",
                      },
                      "string": Object {
                        "type": "text",
                      },
                    },
                    "type": "keyword",
                  },
                },
                "type": "nested",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 2', () => {
    it('returns version 2 changes correctly', () => {
      expect(modelVersion2.changes).toMatchInlineSnapshot(`
              Array [
                Object {
                  "addedMappings": Object {
                    "observables": Object {
                      "properties": Object {
                        "typeKey": Object {
                          "type": "keyword",
                        },
                        "value": Object {
                          "type": "keyword",
                        },
                      },
                      "type": "nested",
                    },
                  },
                  "type": "mappings_addition",
                },
              ]
          `);
    });
  });

  describe('version 3', () => {
    it('returns version 3 changes correctly', () => {
      expect(modelVersion3.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "incremental_id": Object {
                "type": "unsigned_long",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });
});
