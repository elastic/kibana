/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import migrations from './migrations';

describe('graph-workspace', () => {
  describe('7.0.0', () => {
    const migration = migrations['graph-workspace']['7.0.0'];

    test('returns doc on empty object', () => {
      expect(migration({})).toMatchInlineSnapshot(`
Object {
  "references": Array [],
}
`);
    });

    test('returns doc when wsState is not a string', () => {
      const doc = {
        id: '1',
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
}
`);
    });

    test('returns doc when wsState is not valid JSON', () => {
      const doc = {
        id: '1',
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
}
`);
    });

    test('returns doc when "indexPattern" is missing from wsState', () => {
      const doc = {
        id: '1',
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
}
`);
    });

    test('extract "indexPattern" attribute from doc', () => {
      const doc = {
        id: '1',
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
}
`);
    });
  });
});
