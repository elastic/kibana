/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, Provider } from 'react-redux';

import { stringValidator } from './validators/string_validator';
import { createFormField } from './form_field';
import { createFormSlice } from './form_slice';
import { useSubmitErrorMessage } from './use_submit_error_message';

const formSlice = createFormSlice('test', [createFormField('name')], [], { stringValidator });

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const ReduxProvider: FC = ({ children }) => {
  return <Provider store={reduxStore}>{children}</Provider>;
};

describe('useSubmitErrorMessage', () => {
  it('should return the submit error message', () => {
    const { result } = renderHook(
      () => ({
        dispatch: useDispatch(),
        submitErrorMessage: useSubmitErrorMessage(formSlice.name),
      }),
      {
        wrapper: ReduxProvider,
      }
    );

    expect(result.current.submitErrorMessage).toBe(undefined);

    act(() => {
      result.current.dispatch(formSlice.actions.setSubmitErrorMessage('ERROR'));
    });

    expect(result.current.submitErrorMessage).toBe('ERROR');
  });
});
