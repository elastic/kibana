/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { RadioGroup } from './radio_group';

const OPTIONS = ['low', 'medium', 'high', 'critical'];

interface FormWrapperProps {
  isRequired?: boolean;
  initialValue?: string;
  defaultOption?: string;
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  initialValue,
  defaultOption,
  onSubmitResult,
}) => {
  const { form } = useForm<{}>({
    defaultValue: {
      [CASE_EXTENDED_FIELDS]:
        initialValue !== undefined ? { severity_as_keyword: initialValue } : {},
    },
    options: { stripEmptyFields: false },
  });

  const handleSubmit = async () => {
    const { isValid, data } = await form.submit();
    onSubmitResult({ isValid: isValid ?? false, data: data as Record<string, unknown> });
  };

  return (
    <FormProvider form={form}>
      <RadioGroup
        name="severity"
        control="RADIO_GROUP"
        type="keyword"
        label="Severity"
        isRequired={isRequired}
        metadata={{ options: OPTIONS, default: defaultOption }}
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('RadioGroup', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    it('renders a radio for each option', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      for (const option of OPTIONS) {
        expect(screen.getByLabelText(option)).toBeInTheDocument();
      }
    });

    it('pre-selects metadata.default when provided', () => {
      render(<FormWrapper defaultOption="medium" onSubmitResult={jest.fn()} />);
      expect(screen.getByLabelText('medium')).toBeChecked();
      expect(screen.getByLabelText('low')).not.toBeChecked();
    });

    it('falls back to the first option when no default is provided', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      expect(screen.getByLabelText('low')).toBeChecked();
      expect(screen.getByLabelText('medium')).not.toBeChecked();
    });

    it('uses initialValue from form state when provided', () => {
      render(<FormWrapper initialValue="high" onSubmitResult={jest.fn()} />);
      expect(screen.getByLabelText('high')).toBeChecked();
    });

    it('shows the first option selected when form value is empty string (yaml sync with no default)', async () => {
      // useYamlFormSync sets the field to '' when metadata.default is absent.
      // The component must sync the stored value to options[0] so the UI and
      // the form agree — this test uses initialValue="" which now correctly
      // writes the empty string into the form's defaultValue.
      render(<FormWrapper initialValue="" onSubmitResult={jest.fn()} />);
      await waitFor(() => expect(screen.getByLabelText('low')).toBeChecked());
    });
  });

  describe('interaction', () => {
    it('selects an option when clicked', async () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByLabelText('critical'));
      expect(screen.getByLabelText('critical')).toBeChecked();
    });

    it('deselects the previously selected option when a new one is clicked', async () => {
      render(<FormWrapper defaultOption="low" onSubmitResult={jest.fn()} />);
      expect(screen.getByLabelText('low')).toBeChecked();
      await userEvent.click(screen.getByLabelText('high'));
      expect(screen.getByLabelText('high')).toBeChecked();
      expect(screen.getByLabelText('low')).not.toBeChecked();
    });

    it('keeps only one option selected after multiple clicks', async () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByLabelText('medium'));
      await userEvent.click(screen.getByLabelText('high'));
      const checkedOptions = OPTIONS.filter(
        (o) => (screen.getByLabelText(o) as HTMLInputElement).checked
      );
      expect(checkedOptions).toHaveLength(1);
      expect(checkedOptions[0]).toBe('high');
    });
  });

  describe('isRequired validation', () => {
    it('passes required validation when the form value starts as empty string (yaml sync)', async () => {
      // The component syncs '' → options[0], so required validation must pass
      // after the sync even though the initial stored value was empty.
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired initialValue="" onSubmitResult={onSubmitResult} />);

      await waitFor(() => expect(screen.getByLabelText('low')).toBeChecked());
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows submission when isRequired is true and an option is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired defaultOption="medium" onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows submission when isRequired is false and an option is selected', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper isRequired={false} defaultOption="low" onSubmitResult={onSubmitResult} />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });
  });

  describe('submitted value', () => {
    it('submits options[0] when the initial form value is empty string (yaml sync)', async () => {
      // Regression: before the fix the submitted value was '' even though the
      // UI showed 'low' as selected.
      const onSubmitResult = jest.fn();
      render(<FormWrapper initialValue="" onSubmitResult={onSubmitResult} />);

      await waitFor(() => expect(screen.getByLabelText('low')).toBeChecked());
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.severity_as_keyword;

      expect(submitted).toBe('low');
    });

    it('submits the selected option as a plain string', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByLabelText('high'));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.severity_as_keyword;

      expect(submitted).toBe('high');
    });

    it('submits metadata.default value when no interaction has occurred', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper defaultOption="medium" onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.severity_as_keyword;

      expect(submitted).toBe('medium');
    });

    it('submitted value is a plain string, not a JSON array', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper defaultOption="low" onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.severity_as_keyword;

      expect(typeof submitted).toBe('string');
      expect(() => JSON.parse(submitted as string)).toThrow();
    });
  });
});
