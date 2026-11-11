/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n as render } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { MissingValuesOptions } from './missing_values_option';

describe('Missing values option', () => {
  it('should show currently selected fitting function', () => {
    render(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        fittingFunction={'Carry'}
        onEmphasizeFittingChange={jest.fn()}
        onEndValueChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('lnsMissingValuesSelect')).toHaveTextContent('Last');
  });

  it('should show the fitting option when enabled', () => {
    render(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        fittingFunction={'Carry'}
        isFittingEnabled={true}
        onEmphasizeFittingChange={jest.fn()}
        onEndValueChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('lnsMissingValuesSelect')).toBeInTheDocument();
  });

  it('should hide the fitting option when disabled', () => {
    render(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        fittingFunction={'Carry'}
        isFittingEnabled={false}
        onEmphasizeFittingChange={jest.fn()}
        onEndValueChange={jest.fn()}
      />
    );

    expect(screen.queryByTestId('lnsMissingValuesSelect')).not.toBeInTheDocument();
  });
});
