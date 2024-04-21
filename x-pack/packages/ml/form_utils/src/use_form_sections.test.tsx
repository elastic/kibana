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
import { createFormSection } from './form_section';
import { createFormSlice } from './form_slice';
import { useFormSections, useFormSection } from './use_form_sections';

const formSlice = createFormSlice(
  'test',
  [createFormField('firstName')],
  [createFormSection('settings'), createFormSection('auth')],
  {}
);

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const ReduxProvider: FC = ({ children }) => {
  return <Provider store={reduxStore}>{children}</Provider>;
};

describe('useFormSections', () => {
  it('should return all form sections', () => {
    const { result } = renderHook(() => useFormSections(formSlice), {
      wrapper: ReduxProvider,
    });

    expect(result.current).toStrictEqual({
      auth: {
        configFieldName: undefined,
        defaultEnabled: false,
        enabled: false,
        formSectionName: 'auth',
      },
      settings: {
        configFieldName: undefined,
        defaultEnabled: false,
        enabled: false,
        formSectionName: 'settings',
      },
    });
  });
});

describe('useFormSection', () => {
  it('should return the selected form section', () => {
    const { result } = renderHook(() => useFormSection(formSlice, 'settings'), {
      wrapper: ReduxProvider,
    });

    expect(result.current).toStrictEqual({
      configFieldName: undefined,
      defaultEnabled: false,
      enabled: false,
      formSectionName: 'settings',
    });
  });
});
