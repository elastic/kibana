/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { filterRatioOperation } from './filter_ratio';
import { shallow } from 'enzyme';
import { FilterRatioIndexPatternColumn, IndexPatternPrivateState } from '../indexpattern';
import { data as dataMock } from '../../../../../../../src/legacy/core_plugins/data/public/setup';
import { localStorage as storageMock } from 'ui/storage/storage_service';

jest.mock('../loader');
jest.mock('ui/new_platform');
jest.mock('ui/chrome');
jest.mock('ui/storage/storage_service');
jest.mock('plugins/data/setup', () => ({ data: { query: { ui: {} } } }));

describe('filter_ratio', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = filterRatioOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatterns: {
        1: {
          id: '1',
          title: 'Mock Indexpattern',
          fields: [],
        },
      },
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Filter Ratio',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'filter_ratio',
          params: {
            numerator: { query: '', language: 'kuery' },
            denominator: { query: '*', language: 'kuery' },
          },
        },
      },
    };
  });

  describe('buildColumn', () => {
    it('should create column object with default params', () => {
      const column = filterRatioOperation.buildColumn('op', 0);
      expect(column.params.numerator).toEqual({ query: '', language: 'kuery' });
      expect(column.params.denominator).toEqual({ query: '*', language: 'kuery' });
    });
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = filterRatioOperation.toEsAggsConfig(
        state.columns.col1 as FilterRatioIndexPatternColumn,
        'col1'
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            filters: [
              {
                input: { query: '', language: 'kuery' },
                label: '',
              },
              {
                input: { query: '*', language: 'kuery' },
                label: '',
              },
            ],
          }),
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      expect(() => {
        shallow(
          <InlineOptions
            state={state}
            setState={jest.fn()}
            columnId="col1"
            storage={storageMock}
            dataPlugin={dataMock}
          />
        );
      }).not.toThrow();
    });
  });
});
