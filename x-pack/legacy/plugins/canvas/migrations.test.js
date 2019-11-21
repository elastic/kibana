/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { migrations } from './migrations';
import { CANVAS_TYPE } from './common/lib';

describe(`${CANVAS_TYPE}`, () => {
  describe('7.0.0', () => {
    const migrate = doc => migrations[CANVAS_TYPE]['7.0.0'](doc);

    it('does not throw error on empty object', () => {
      const migratedDoc = migrate({});
      expect(migratedDoc).toMatchInlineSnapshot(`Object {}`);
    });

    it('removes id from "attributes"', () => {
      const migratedDoc = migrate({
        foo: true,
        attributes: {
          id: '123',
          bar: true,
        },
      });
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "bar": true,
  },
  "foo": true,
}
`);
    });
  });
});
