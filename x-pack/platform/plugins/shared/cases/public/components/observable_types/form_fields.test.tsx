/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { FormTestComponent } from '../../common/test_utils';
import { FormFields } from './form_fields';
import { renderWithTestingProviders } from '../../common/mock';

describe('FormFields ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('observable-type-label-input')).toBeInTheDocument();
  });
});
