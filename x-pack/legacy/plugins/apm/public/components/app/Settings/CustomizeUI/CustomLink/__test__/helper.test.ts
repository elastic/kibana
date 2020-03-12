/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  convertFiltersToArray,
  convertFiltersToObject,
  getSelectOptions,
  filterSelectOptions
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
    it('returns all option', () => {
      expect(getSelectOptions([['', '']], 0)).toEqual(filterSelectOptions);
    });
    it('removes options previously added from the third filter', () => {
      expect(
        getSelectOptions(
          [
            ['service.name', 'foo'],
            ['transaction.type', 'bar']
          ],
          2
        )
      ).toEqual(
        filterSelectOptions.filter(
          ({ value }) =>
            value !== 'service.name' && value !== 'transaction.type'
        )
      );
    });
    it('keeps the selected option available in the current filter', () => {
      expect(
        getSelectOptions(
          [
            ['service.name', 'foo'],
            ['transaction.type', 'bar']
          ],
          1
        )
      ).toEqual(
        filterSelectOptions.filter(({ value }) => value !== 'service.name')
      );
    });
  });
});
