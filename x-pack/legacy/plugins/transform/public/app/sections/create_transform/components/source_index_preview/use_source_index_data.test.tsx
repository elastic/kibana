/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

import { SimpleQuery } from '../../../../common';
import {
  SOURCE_INDEX_STATUS,
  useSourceIndexData,
  UseSourceIndexDataReturnType,
} from './use_source_index_data';

jest.mock('../../../../hooks/use_api');

type Callback = () => void;
interface TestHookProps {
  callback: Callback;
}

const TestHook: FC<TestHookProps> = ({ callback }) => {
  callback();
  return null;
};

const testHook = (callback: Callback) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    ReactDOM.render(<TestHook callback={callback} />, container);
  });
};

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

let sourceIndexObj: UseSourceIndexDataReturnType;

describe('useSourceIndexData', () => {
  test('indexPattern set triggers loading', () => {
    testHook(() => {
      act(() => {
        sourceIndexObj = useSourceIndexData(
          { id: 'the-id', title: 'the-title', fields: [] },
          query,
          [],
          () => {}
        );
      });
    });

    expect(sourceIndexObj.errorMessage).toBe('');
    expect(sourceIndexObj.status).toBe(SOURCE_INDEX_STATUS.LOADING);
    expect(sourceIndexObj.tableItems).toEqual([]);
  });

  // TODO add more tests to check data retrieved via `api.esSearch()`.
  // This needs more investigation in regards to jest/enzyme's React Hooks support.
});
