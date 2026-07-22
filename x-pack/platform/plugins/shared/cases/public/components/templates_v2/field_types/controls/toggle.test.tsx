/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { Toggle } from './toggle';

interface FormWrapperProps {
  isRequired?: boolean;
  initialValue?: string;
  defaultValue?: boolean;
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  initialValue,
  defaultValue,
  onSubmitResult,
}) => {
  const form = useForm({
    defaultValues: {
      [CASE_EXTENDED_FIELDS]:
        initialValue !== undefined ? { requires_escalation_as_keyword: initialValue } : {},
    },
  });

  const handleSubmit = form.handleSubmit(
    (data) => onSubmitResult({ isValid: true, data: data as Record<string, unknown> }),
    () =>
      onSubmitResult({
        isValid: false,
        data: form.getValues() as Record<string, unknown>,
      })
  );

  return (
    <FormProvider {...form}>
      <Toggle
        name="requires_escalation"
        control="TOGGLE"
        type="keyword"
        label="Requires escalation"
        isRequired={isRequired}
        metadata={defaultValue !== undefined ? { default: defaultValue } : undefined}
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('Toggle', () => {
  it('renders the field label', () => {
    render(<FormWrapper onSubmitResult={jest.fn()} />);
    expect(screen.getByText('Requires escalation')).toBeInTheDocument();
  });

  it('uses metadata default true as checked', () => {
    render(<FormWrapper defaultValue onSubmitResult={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Requires escalation' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('uses metadata default false as unchecked', () => {
    render(<FormWrapper defaultValue={false} onSubmitResult={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Requires escalation' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('submits true when toggled on', async () => {
    const onSubmitResult = jest.fn();
    render(<FormWrapper defaultValue={false} onSubmitResult={onSubmitResult} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Requires escalation' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalled();
    });

    const { data } = onSubmitResult.mock.calls[0][0];
    const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
      ?.requires_escalation_as_keyword;
    expect(submitted).toBe('true');
  });

  it('submits false when toggled off', async () => {
    const onSubmitResult = jest.fn();
    render(<FormWrapper defaultValue onSubmitResult={onSubmitResult} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Requires escalation' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalled();
    });

    const { data } = onSubmitResult.mock.calls[0][0];
    const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
      ?.requires_escalation_as_keyword;
    expect(submitted).toBe('false');
  });

  it('defaults required toggle to false when no metadata default is provided', async () => {
    const onSubmitResult = jest.fn();
    render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalled();
    });

    const { isValid, data } = onSubmitResult.mock.calls[0][0];
    const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
      ?.requires_escalation_as_keyword;
    expect(isValid).toBe(true);
    expect(submitted).toBe('false');
  });
});
