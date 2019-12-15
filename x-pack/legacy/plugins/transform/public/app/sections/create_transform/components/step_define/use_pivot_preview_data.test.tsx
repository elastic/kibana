/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

import { SimpleQuery } from '../../../../common';
import {
  PIVOT_PREVIEW_STATUS,
  usePivotPreviewData,
  UsePivotPreviewDataReturnType,
} from './use_pivot_preview_data';

import { IndexPattern } from 'ui/index_patterns';

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
  ReactDOM.render(<TestHook callback={callback} />, container);
};

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

let pivotPreviewObj: UsePivotPreviewDataReturnType;

describe('usePivotPreviewData', () => {
  test('indexPattern not defined', () => {
    testHook(() => {
      pivotPreviewObj = usePivotPreviewData(
        ({ id: 'the-id', title: 'the-title', fields: [] } as unknown) as IndexPattern,
        query,
        {},
        {}
      );
    });

    expect(pivotPreviewObj.errorMessage).toBe('');
    expect(pivotPreviewObj.status).toBe(PIVOT_PREVIEW_STATUS.UNUSED);
    expect(pivotPreviewObj.previewData).toEqual([]);
  });

  test('indexPattern set triggers loading', () => {
    testHook(() => {
      pivotPreviewObj = usePivotPreviewData(
        ({ id: 'the-id', title: 'the-title', fields: [] } as unknown) as IndexPattern,
        query,
        {},
        {}
      );
    });

    expect(pivotPreviewObj.errorMessage).toBe('');
    // ideally this should be LOADING instead of UNUSED but jest/enzyme/hooks doesn't
    // trigger that state upate yet.
    expect(pivotPreviewObj.status).toBe(PIVOT_PREVIEW_STATUS.UNUSED);
    expect(pivotPreviewObj.previewData).toEqual([]);
  });

  // TODO add more tests to check data retrieved via `api.esSearch()`.
  // This needs more investigation in regards to jest/enzyme's React Hooks support.
});
