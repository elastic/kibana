/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDestinationIndexAliases } from './transform_utils';

describe('test transform_utils', () => {
  describe('getDestinationIndexAliases()', function () {
    test('return transform alias settings when input is an object', () => {
      expect(
        getDestinationIndexAliases({
          'alias1.latest': { move_on_creation: true },
          'alias1.all': { move_on_creation: false },
        })
      ).toStrictEqual([
        { alias: 'alias1.latest', move_on_creation: true },
        { alias: 'alias1.all', move_on_creation: false },
      ]);

      expect(
        getDestinationIndexAliases({
          'alias1.latest': null,
          'alias1.all': { move_on_creation: false },
          alias2: { move_on_creation: true },
          alias3: undefined,
          alias4: '',
          alias5: 'invalid string',
        })
      ).toStrictEqual([
        { alias: 'alias1.latest', move_on_creation: false },
        { alias: 'alias1.all', move_on_creation: false },
        { alias: 'alias2', move_on_creation: true },
        { alias: 'alias3', move_on_creation: false },
        { alias: 'alias4', move_on_creation: false },
        { alias: 'alias5', move_on_creation: false },
      ]);
    });

    test('return transform alias settings when input is an array', () => {
      const aliasSettings = ['alias1.latest', 'alias1.all'];
      expect(getDestinationIndexAliases(aliasSettings)).toStrictEqual([
        { alias: 'alias1.latest', move_on_creation: true },
        { alias: 'alias1.all', move_on_creation: false },
      ]);
    });

    test('return transform alias settings when input is an array of object', () => {
      const aliasSettings = [
        { alias: 'alias1', move_on_creation: true },
        { alias: 'alias2' },
        { alias: 'alias3', move_on_creation: false },
      ];
      expect(getDestinationIndexAliases(aliasSettings)).toStrictEqual([
        { alias: 'alias1', move_on_creation: true },
        { alias: 'alias2', move_on_creation: false },
        { alias: 'alias3', move_on_creation: false },
      ]);

      expect(
        getDestinationIndexAliases([
          ...aliasSettings,
          undefined,
          {},
          { invalid_object: true },
          null,
          'alias3.all',
        ])
      ).toStrictEqual([
        { alias: 'alias1', move_on_creation: true },
        { alias: 'alias2', move_on_creation: false },
        { alias: 'alias3', move_on_creation: false },
        { alias: 'alias3.all', move_on_creation: false },
      ]);
    });

    test('return transform alias settings when input is a string', () => {
      expect(getDestinationIndexAliases('alias1.latest')).toStrictEqual([
        { alias: 'alias1.latest', move_on_creation: true },
      ]);

      expect(getDestinationIndexAliases('alias1.all')).toStrictEqual([
        { alias: 'alias1.all', move_on_creation: false },
      ]);
    });

    test('return empty array when input is invalid', () => {
      expect(getDestinationIndexAliases(undefined)).toStrictEqual([]);

      expect(getDestinationIndexAliases({})).toStrictEqual([]);
    });
  });
});
