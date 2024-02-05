/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { createFormField } from './form_field';
import { createFormSlice } from './form_slice';
import { useFormField } from './use_form_field';

const formSlice = createFormSlice('test', [createFormField('firstName')], [], {});

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const ReduxProvider: FC = ({ children }) => {
  return <Provider store={reduxStore}>{children}</Provider>;
};

describe('useFormField', () => {
  it('should return the form field state', () => {
    const { result } = renderHook(() => useFormField(formSlice, 'firstName'), {
      wrapper: ReduxProvider,
    });

    expect(result.current).toStrictEqual({
      configFieldName: undefined,
      defaultValue: '',
      dependsOn: [],
      errors: [],
      formFieldName: 'firstName',
      isNullable: false,
      isOptional: true,
      validator: 'stringValidator',
      value: '',
      valueParser: 'defaultParser',
    });
  });
});
