/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { DatePicker } from './date_picker';

interface FormWrapperProps {
  isRequired?: boolean;
  showTime?: boolean;
  timezone?: 'utc' | 'local';
  initialValue?: string;
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  showTime,
  timezone,
  initialValue,
  onSubmitResult,
}) => {
  const { form } = useForm<{}>({
    defaultValue: {
      [CASE_EXTENDED_FIELDS]: initialValue ? { due_date_as_date: initialValue } : {},
    },
    options: { stripEmptyFields: false },
  });

  const handleSubmit = async () => {
    const { isValid, data } = await form.submit();
    onSubmitResult({ isValid: isValid ?? false, data: data as Record<string, unknown> });
  };

  return (
    <FormProvider form={form}>
      <DatePicker
        name="due_date"
        control="DATE_PICKER"
        type="date"
        label="Due date"
        isRequired={isRequired}
        metadata={
          showTime !== undefined || timezone !== undefined
            ? { show_time: showTime, timezone }
            : undefined
        }
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('DatePicker', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      expect(screen.getByText('Due date')).toBeInTheDocument();
    });

    it('renders an input element', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('shows Optional label when isRequired is false', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired={false} onSubmitResult={onSubmitResult} />);

      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('does not show Optional label when isRequired is true', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      expect(screen.queryByText('Optional')).not.toBeInTheDocument();
    });
  });

  describe('isRequired validation', () => {
    it('blocks form submission when isRequired is true and no date is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('allows form submission when isRequired is false and no date is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired={false} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows form submission when isRequired is true and a date is pre-populated', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          isRequired
          initialValue="2024-06-01T00:00:00.000Z"
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('shows an error message when required validation fails', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });
  });

  describe('show_time metadata', () => {
    it('does not show the time selector by default', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      // react-datepicker renders a time input only when showTimeSelect is true
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('serializer', () => {
    it('serializes a UTC ISO string default to a UTC ISO string on submit', async () => {
      const onSubmitResult = jest.fn();
      const isoValue = '2024-06-01T09:00:00.000Z';

      render(<FormWrapper initialValue={isoValue} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submittedValue = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.due_date_as_date;

      // The serializer must always emit a UTC ISO string
      expect(typeof submittedValue).toBe('string');
      expect(submittedValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(moment.utc(submittedValue as string).isValid()).toBe(true);
    });
  });
});
