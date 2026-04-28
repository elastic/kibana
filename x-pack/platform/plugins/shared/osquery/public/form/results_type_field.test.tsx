/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

import { ResultsTypeField } from './results_type_field';

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: { snapshot?: boolean; removed?: boolean };
}> = ({ children, defaultValues = { snapshot: true, removed: false } }) => {
  const methods = useForm({ defaultValues });

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>{children}</FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('ResultsTypeField', () => {
  it('should default to Snapshot when snapshot is true', () => {
    render(
      <FormWrapper defaultValues={{ snapshot: true, removed: false }}>
        <ResultsTypeField />
      </FormWrapper>
    );

    expect(screen.getByTestId('resultsTypeField')).toHaveTextContent('Snapshot');
  });

  it('should show Differential when snapshot is false and removed is true', () => {
    render(
      <FormWrapper defaultValues={{ snapshot: false, removed: true }}>
        <ResultsTypeField />
      </FormWrapper>
    );

    expect(screen.getByTestId('resultsTypeField')).toHaveTextContent('Differential');
  });

  it('should show Differential (Ignore removals) when snapshot and removed are false', () => {
    render(
      <FormWrapper defaultValues={{ snapshot: false, removed: false }}>
        <ResultsTypeField />
      </FormWrapper>
    );

    expect(screen.getByTestId('resultsTypeField')).toHaveTextContent(
      'Differential (Ignore removals)'
    );
  });

  it('should render the Result type label', () => {
    render(
      <FormWrapper>
        <ResultsTypeField />
      </FormWrapper>
    );

    expect(screen.getByText('Result type')).toBeInTheDocument();
  });

  it('should be disabled when euiFieldProps.isDisabled is true', () => {
    render(
      <FormWrapper>
        <ResultsTypeField euiFieldProps={{ isDisabled: true }} />
      </FormWrapper>
    );

    expect(screen.getByTestId('resultsTypeField')).toBeDisabled();
  });
});
