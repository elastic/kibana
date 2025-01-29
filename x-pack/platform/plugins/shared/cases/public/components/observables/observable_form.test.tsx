/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { ObservableForm, type ObservableFormProps } from './observable_form';

describe('ObservableForm', () => {
  let appMock: AppMockRenderer;
  const props: ObservableFormProps = {
    isLoading: false,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<ObservableForm {...props} />);

    expect(result.getByTestId('save-observable')).toBeInTheDocument();
  });
});
