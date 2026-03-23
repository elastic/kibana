/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { RetentionPeriodField } from './retention_period_field';

const TestWrapper = ({
  disabled,
  retentionPeriod,
}: {
  disabled: boolean;
  retentionPeriod: { value: number; unit: string };
}) => {
  const { form } = useForm({
    defaultValue: {
      retentionPeriodValue: retentionPeriod.value,
      retentionPeriodUnit: retentionPeriod.unit,
    },
  });

  return (
    <Form form={form}>
      <RetentionPeriodField disabled={disabled} />
    </Form>
  );
};

const renderField = ({
  disabled = false,
  retentionPeriod = { value: 15, unit: 'd' },
}: {
  disabled?: boolean;
  retentionPeriod?: { value: number; unit: string };
}) => {
  return render(
    <IntlProvider>
      <TestWrapper disabled={disabled} retentionPeriod={retentionPeriod} />
    </IntlProvider>
  );
};

describe('RetentionPeriodField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders value and unit fields', () => {
    const { getByTestId } = renderField({});

    expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
    expect(getByTestId('selectFailureStorePeriodValue')).toHaveValue(15);
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toHaveTextContent('Days');
  });

  it('renders unit label if it exists', () => {
    const { getByTestId } = renderField({
      retentionPeriod: { value: 15, unit: 'ms' },
    });

    expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
    expect(getByTestId('selectFailureStorePeriodValue')).toHaveValue(15);
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toHaveTextContent('Milliseconds');
  });

  it('renders unit if label does not exist', () => {
    const { getByTestId } = renderField({
      retentionPeriod: { value: 15, unit: 'otherUnit' },
    });

    expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
    expect(getByTestId('selectFailureStorePeriodValue')).toHaveValue(15);
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toHaveTextContent('otherUnit');
  });

  it('disables fields when disabled prop is true', () => {
    const { getByTestId } = renderField({
      disabled: true,
    });

    expect(getByTestId('selectFailureStorePeriodValue')).toBeDisabled();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeDisabled();
  });

  it('renders only days, hours, minutes and seconds options', () => {
    const { queryByTestId, getByTestId } = renderField({});

    fireEvent.click(getByTestId('selectFailureStoreRetentionPeriodUnit'));
    expect(queryByTestId('retentionPeriodUnit-d')).toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-h')).toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-m')).toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-s')).toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-ms')).not.toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-micros')).not.toBeInTheDocument();
    expect(queryByTestId('retentionPeriodUnit-nanos')).not.toBeInTheDocument();
  });
});
