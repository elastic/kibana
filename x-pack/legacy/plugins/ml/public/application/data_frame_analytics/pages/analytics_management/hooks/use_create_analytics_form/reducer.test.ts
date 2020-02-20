/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';

import { DataFrameAnalyticsConfig } from '../../../../common';

import { ACTION } from './actions';
import { reducer, validateAdvancedEditor } from './reducer';
import { getInitialState, JOB_TYPES } from './state';

type SourceIndex = DataFrameAnalyticsConfig['source']['index'];

const getMockState = ({
  index,
  modelMemoryLimit = '100mb',
}: {
  index: SourceIndex;
  modelMemoryLimit?: string;
}) =>
  merge(getInitialState(), {
    form: {
      jobIdEmpty: false,
      jobIdValid: true,
      jobIdExists: false,
      createIndexPattern: false,
    },
    jobConfig: {
      source: { index },
      dest: { index: 'the-destination-index' },
      analysis: {},
      model_memory_limit: modelMemoryLimit,
    },
  });

describe('useCreateAnalyticsForm', () => {
  test('reducer(): provide a minimum required valid job config, then reset.', () => {
    const initialState = getInitialState();
    expect(initialState.isValid).toBe(false);

    const updatedState = reducer(initialState, {
      type: ACTION.SET_FORM_STATE,
      payload: {
        destinationIndex: 'the-destination-index',
        jobId: 'the-analytics-job-id',
        sourceIndex: 'the-source-index',
        jobType: JOB_TYPES.OUTLIER_DETECTION,
      },
    });
    expect(updatedState.isValid).toBe(true);

    const resettedState = reducer(updatedState, {
      type: ACTION.RESET_FORM,
    });
    expect(resettedState).toEqual(initialState);
  });

  test('reducer(): open/close the modal', () => {
    const initialState = getInitialState();
    expect(initialState.isModalVisible).toBe(false);

    const openModalState = reducer(initialState, {
      type: ACTION.OPEN_MODAL,
    });
    expect(openModalState.isModalVisible).toBe(true);

    const closedModalState = reducer(openModalState, {
      type: ACTION.CLOSE_MODAL,
    });
    expect(closedModalState.isModalVisible).toBe(false);
  });

  test('reducer(): add/reset request messages', () => {
    const initialState = getInitialState();
    expect(initialState.requestMessages).toHaveLength(0);

    const requestMessageState = reducer(initialState, {
      type: ACTION.ADD_REQUEST_MESSAGE,
      requestMessage: {
        message: 'the-message',
      },
    });
    expect(requestMessageState.requestMessages).toHaveLength(1);

    const resetMessageState = reducer(requestMessageState, {
      type: ACTION.RESET_REQUEST_MESSAGES,
    });
    expect(resetMessageState.requestMessages).toHaveLength(0);
  });

  test('validateAdvancedEditor(): check index pattern variations', () => {
    // valid single index pattern
    expect(validateAdvancedEditor(getMockState({ index: 'the-source-index' })).isValid).toBe(true);
    // valid array with one ES index pattern
    expect(validateAdvancedEditor(getMockState({ index: ['the-source-index'] })).isValid).toBe(
      true
    );
    // valid array with two ES index patterns
    expect(
      validateAdvancedEditor(getMockState({ index: ['the-source-index-1', 'the-source-index-2'] }))
        .isValid
    ).toBe(true);
    // invalid comma-separated index pattern, this is only allowed in the simple form
    // but not the advanced editor.
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index-1,the-source-index-2' }))
        .isValid
    ).toBe(false);
    expect(
      validateAdvancedEditor(
        getMockState({ index: ['the-source-index-1,the-source-index-2', 'the-source-index-3'] })
      ).isValid
    ).toBe(false);
    // invalid formats ("fake" TS casting to get valid TS and be able to run the tests)
    expect(validateAdvancedEditor(getMockState({ index: {} as SourceIndex })).isValid).toBe(false);
    expect(
      validateAdvancedEditor(getMockState({ index: (undefined as unknown) as SourceIndex })).isValid
    ).toBe(false);
  });

  test('validateAdvancedEditor(): check model memory limit validation', () => {
    // valid model_memory_limit units
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: '100mb' }))
        .isValid
    ).toBe(true);
    // invalid model_memory_limit units
    expect(
      validateAdvancedEditor(
        getMockState({ index: 'the-source-index', modelMemoryLimit: '100bob' })
      ).isValid
    ).toBe(false);
    // invalid model_memory_limit if empty
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: '' }))
        .isValid
    ).toBe(false);
    // can still run validation check on model_memory_limit if number type
    expect(
      // @ts-ignore number is not assignable to type string - mml gets converted to string prior to creation
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: 100 }))
        .isValid
    ).toBe(false);
  });
});
