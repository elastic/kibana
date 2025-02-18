/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { graphMigrations } from './migrations';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

describe('graph-workspace', () => {
  describe('7.0.0', () => {
    const migration = graphMigrations['7.0.0'];

    test('returns doc on empty object', () => {
      expect(migration({} as SavedObjectUnsanitizedDoc)).toMatchInlineSnapshot(`
        Object {
          "references": Array [],
        }
      `);
    });

    test('returns doc when wsState is not a string', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: true,
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "wsState": true,
          },
          "id": "1",
          "references": Array [],
          "type": "graph-workspace",
        }
      `);
    });

    test('returns doc when wsState is not valid JSON', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: '123abc',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "wsState": "123abc",
          },
          "id": "1",
          "references": Array [],
          "type": "graph-workspace",
        }
      `);
    });

    test('returns doc when "indexPattern" is missing from wsState', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: JSON.stringify(JSON.stringify({ foo: true })),
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "wsState": "\\"{\\\\\\"foo\\\\\\":true}\\"",
          },
          "id": "1",
          "references": Array [],
          "type": "graph-workspace",
        }
      `);
    });

    test('extract "indexPattern" attribute from doc', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: JSON.stringify(JSON.stringify({ foo: true, indexPattern: 'pattern*' })),
          bar: true,
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "bar": true,
            "wsState": "\\"{\\\\\\"foo\\\\\\":true,\\\\\\"indexPatternRefName\\\\\\":\\\\\\"indexPattern_0\\\\\\"}\\"",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "pattern*",
              "name": "indexPattern_0",
              "type": "index-pattern",
            },
          ],
          "type": "graph-workspace",
        }
      `);
    });
  });

  describe('7.11', () => {
    const migration = graphMigrations['7.11.0'];

    test('remove broken reference and set legacy attribute', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: JSON.stringify(
            JSON.stringify({ foo: true, indexPatternRefName: 'indexPattern_0' })
          ),
          bar: true,
        },
        references: [
          {
            id: 'pattern*',
            name: 'indexPattern_0',
            type: 'index-pattern',
          },
        ],
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "bar": true,
            "legacyIndexPatternRef": "pattern*",
            "wsState": "\\"{\\\\\\"foo\\\\\\":true}\\"",
          },
          "id": "1",
          "references": Array [],
          "type": "graph-workspace",
        }
      `);
    });

    test('bails out on missing reference', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: JSON.stringify(
            JSON.stringify({ foo: true, indexPatternRefName: 'indexPattern_0' })
          ),
          bar: true,
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toBe(doc);
    });

    test('bails out on missing index pattern in state', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: JSON.stringify(JSON.stringify({ foo: true })),
          bar: true,
        },
        references: [
          {
            id: 'pattern*',
            name: 'indexPattern_0',
            type: 'index-pattern',
          },
        ],
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toBe(doc);
    });

    test('bails out on broken wsState', () => {
      const doc = {
        id: '1',
        type: 'graph-workspace',
        attributes: {
          wsState: '{{[[',
          bar: true,
        },
        references: [
          {
            id: 'pattern*',
            name: 'indexPattern_0',
            type: 'index-pattern',
          },
        ],
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toBe(doc);
    });
  });
});
