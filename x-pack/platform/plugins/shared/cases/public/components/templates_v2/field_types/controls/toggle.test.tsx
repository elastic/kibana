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
  onConfirm?: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  initialValue,
  defaultValue,
  onConfirm,
  isSaving,
  isSaveDisabled,
  onSubmitResult,
}) => {
  const form = useForm({
    defaultValues: {
      [CASE_EXTENDED_FIELDS]:
        initialValue !== undefined ? { requires_escalation_as_boolean: initialValue } : {},
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
        type="boolean"
        label="Requires escalation"
        isRequired={isRequired}
        metadata={defaultValue !== undefined ? { default: defaultValue } : undefined}
        onConfirm={onConfirm}
        isSaving={isSaving}
        isSaveDisabled={isSaveDisabled}
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
      ?.requires_escalation_as_boolean;
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
      ?.requires_escalation_as_boolean;
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
      ?.requires_escalation_as_boolean;
    expect(isValid).toBe(true);
    expect(submitted).toBe('false');
  });

  describe('inline confirm/cancel actions', () => {
    it('does not render the actions when onConfirm is not provided', async () => {
      render(<FormWrapper defaultValue={false} onSubmitResult={jest.fn()} />);

      await userEvent.click(screen.getByRole('switch', { name: 'Requires escalation' }));

      expect(
        screen.queryByTestId('template-field-confirm-requires_escalation')
      ).not.toBeInTheDocument();
    });

    it('shows the confirm/cancel actions only after the toggle changes', async () => {
      render(<FormWrapper defaultValue={false} onConfirm={jest.fn()} onSubmitResult={jest.fn()} />);

      expect(
        screen.queryByTestId('template-field-confirm-requires_escalation')
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch', { name: 'Requires escalation' }));

      expect(screen.getByTestId('template-field-confirm-requires_escalation')).toBeInTheDocument();
      expect(screen.getByTestId('template-field-cancel-requires_escalation')).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm action is clicked', async () => {
      const onConfirm = jest.fn();
      render(<FormWrapper defaultValue={false} onConfirm={onConfirm} onSubmitResult={jest.fn()} />);

      await userEvent.click(screen.getByRole('switch', { name: 'Requires escalation' }));
      await userEvent.click(screen.getByTestId('template-field-confirm-requires_escalation'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('resets the toggle and hides the actions when cancelling', async () => {
      render(<FormWrapper defaultValue={false} onConfirm={jest.fn()} onSubmitResult={jest.fn()} />);

      const toggle = screen.getByRole('switch', { name: 'Requires escalation' });
      await userEvent.click(toggle);
      expect(toggle).toBeChecked();

      await userEvent.click(screen.getByTestId('template-field-cancel-requires_escalation'));

      expect(screen.getByRole('switch', { name: 'Requires escalation' })).not.toBeChecked();
      expect(
        screen.queryByTestId('template-field-confirm-requires_escalation')
      ).not.toBeInTheDocument();
    });

    it('disables the switch while saving', async () => {
      render(
        <FormWrapper
          defaultValue={false}
          onConfirm={jest.fn()}
          isSaving
          onSubmitResult={jest.fn()}
        />
      );

      expect(screen.getByRole('switch', { name: 'Requires escalation' })).toBeDisabled();
    });
  });
});
