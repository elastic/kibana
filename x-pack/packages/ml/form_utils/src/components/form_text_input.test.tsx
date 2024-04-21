/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';

import React, { FC } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { stringValidator } from '../validators/string_validator';
import { createFormField } from '../form_field';
import { createFormSlice } from '../form_slice';
import { useUpdatedConfig } from '../use_updated_config';

import { FormTextInput } from './form_text_input';

const defaultConfig = { first_name: '' };

const formSlice = createFormSlice(
  'test',
  [createFormField('firstName', 'first_name', defaultConfig)],
  [],
  { stringValidator }
);

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const RenderConfig: FC = () => {
  const updatedConfig = useUpdatedConfig(formSlice, defaultConfig);
  return <div data-test-subj="renderConfig">{JSON.stringify(updatedConfig)}</div>;
};

describe('FormTextInput', () => {
  it('should update the config after input update', () => {
    render(
      <Provider store={reduxStore}>
        <FormTextInput slice={formSlice} field="firstName" label="First name" />
        <RenderConfig />
      </Provider>
    );

    const inputEl = screen.getByTestId('testFirstNameInput');

    expect(inputEl).toBeInTheDocument();
    expect(screen.getByTestId('renderConfig')).toHaveTextContent('{}');

    fireEvent.change(inputEl, { target: { value: 'John' } });

    expect(screen.getByTestId('renderConfig')).toHaveTextContent('{"first_name":"John"}');
  });
});
