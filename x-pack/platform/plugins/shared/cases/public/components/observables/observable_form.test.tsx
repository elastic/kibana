/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ObservableForm, type ObservableFormProps } from './observable_form';
import { renderWithTestingProviders } from '../../common/mock';

describe('ObservableForm', () => {
  const props: ObservableFormProps = {
    isLoading: false,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<ObservableForm {...props} />);

    expect(screen.getByTestId('save-observable')).toBeInTheDocument();
  });
});
