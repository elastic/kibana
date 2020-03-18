/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  convertFiltersToArray,
  convertFiltersToObject,
  getSelectOptions
} from '../CustomLinkFlyout/helper';
import { CustomLink } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';

describe('Custom link helper', () => {
  describe('convertFiltersToArray', () => {
    it('returns array of tuple when custom link not defined', () => {
      expect(convertFiltersToArray()).toEqual([['', '']]);
    });
    it('returns filters as array', () => {
      expect(
        convertFiltersToArray({
          'service.name': 'foo',
          'transaction.type': 'bar'
        } as CustomLink)
      ).toEqual([
        ['service.name', 'foo'],
        ['transaction.type', 'bar']
      ]);
    });
    it('returns empty when no filter is added', () => {
      expect(
        convertFiltersToArray({
          label: 'foo',
          url: 'bar'
        } as CustomLink)
      ).toEqual([['', '']]);
    });
  });

  describe('convertFiltersToObject', () => {
    it('returns undefined when any filter is added', () => {
      expect(convertFiltersToObject([['', '']])).toBeUndefined();
    });
    it('removes uncompleted filters', () => {
      expect(
        convertFiltersToObject([
          ['service.name', ''],
          ['', 'foo'],
          ['transaction.type', 'bar']
        ])
      ).toEqual({ 'transaction.type': ['bar'] });
    });
    it('splits the value by comma', () => {
      expect(
        convertFiltersToObject([
          ['service.name', 'foo'],
          ['service.environment', 'foo, bar'],
          ['transaction.type', 'foo, '],
          ['transaction.name', 'foo,']
        ])
      ).toEqual({
        'service.name': ['foo'],
        'service.environment': ['foo', 'bar'],
        'transaction.type': ['foo'],
        'transaction.name': ['foo']
      });
    });
  });

  describe('getSelectOptions', () => {
    it('returns all available options when no filters were selected', () => {
      expect(
        getSelectOptions(
          [
            ['', ''],
            ['', ''],
            ['', ''],
            ['', '']
          ],
          ''
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.name', text: 'service.name' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' }
      ]);
    });
    it('removes item added in another filter', () => {
      expect(
        getSelectOptions(
          [
            ['service.name', 'foo'],
            ['', ''],
            ['', ''],
            ['', '']
          ],
          ''
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' }
      ]);
    });
    it('removes item added in another filter but keep the current selected', () => {
      expect(
        getSelectOptions(
          [
            ['service.name', 'foo'],
            ['transaction.name', 'bar'],
            ['', ''],
            ['', '']
          ],
          'transaction.name'
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' }
      ]);
    });
    it('returns empty when all option were selected', () => {
      expect(
        getSelectOptions(
          [
            ['service.name', 'foo'],
            ['transaction.name', 'bar'],
            ['service.environment', 'baz'],
            ['transaction.type', 'qux']
          ],
          ''
        )
      ).toEqual([{ value: 'DEFAULT', text: 'Select field...' }]);
    });
  });
});
