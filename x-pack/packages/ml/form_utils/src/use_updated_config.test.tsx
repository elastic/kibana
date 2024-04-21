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
import { useUpdatedConfig } from './use_updated_config';

const defaultConfig: {
  first_name: string;
  last_name: string;
  email?: string;
} = { first_name: '', last_name: '' };
const defaultFormFields = [
  createFormField('firstName', 'first_name', defaultConfig, { isOptional: false }),
  createFormField('lastName', 'last_name', defaultConfig, { isOptional: false }),
  createFormField('email', 'email', defaultConfig),
];
const formSlice = createFormSlice('test', defaultFormFields, [], { stringValidator });

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const ReduxProvider: FC = ({ children }) => {
  return <Provider store={reduxStore}>{children}</Provider>;
};

describe('useUpdatedConfig', () => {
  it('should return the updated config', () => {
    const { result } = renderHook(
      () => ({
        dispatch: useDispatch(),
        updatedConfig: useUpdatedConfig(formSlice, defaultConfig),
      }),
      {
        wrapper: ReduxProvider,
      }
    );

    expect(result.current.updatedConfig).toStrictEqual({});

    act(() => {
      result.current.dispatch(
        formSlice.actions.setFormField({ field: 'firstName', value: 'John' })
      );
    });

    expect(result.current.updatedConfig).toStrictEqual({ first_name: 'John' });

    act(() => {
      result.current.dispatch(formSlice.actions.setFormField({ field: 'lastName', value: 'Doe' }));
    });

    expect(result.current.updatedConfig).toStrictEqual({
      first_name: 'John',
      last_name: 'Doe',
    });
  });
});
