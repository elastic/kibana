/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectActions } from './saved_object';

const version = '1.0.0-zeta1';

describe('#all', () => {
  test(`returns saved_object:*`, () => {
    const savedObjectActions = new SavedObjectActions(version);
    expect(savedObjectActions.all).toBe('saved_object:1.0.0-zeta1:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions(version);
      expect(() => savedObjectActions.get(type, 'foo-action')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions(version);
      expect(() => savedObjectActions.get('foo-type', operation)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `saved_object:${type}/${operation}`', () => {
    const savedObjectActions = new SavedObjectActions(version);
    expect(savedObjectActions.get('foo-type', 'bar-operation')).toBe(
      'saved_object:1.0.0-zeta1:foo-type/bar-operation'
    );
  });
});
