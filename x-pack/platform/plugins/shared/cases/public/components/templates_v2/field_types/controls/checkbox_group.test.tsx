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
import { CheckboxGroup } from './checkbox_group';

const OPTIONS = ['frontend', 'backend', 'database'];

interface FormWrapperProps {
  isRequired?: boolean;
  initialValue?: string[];
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({ isRequired, initialValue, onSubmitResult }) => {
  const { form } = useForm<{}>({
    defaultValue: {
      [CASE_EXTENDED_FIELDS]: initialValue
        ? { affected_systems_as_keyword: JSON.stringify(initialValue) }
        : {},
    },
    options: { stripEmptyFields: false },
  });

  const handleSubmit = async () => {
    const { isValid, data } = await form.submit();
    onSubmitResult({ isValid: isValid ?? false, data: data as Record<string, unknown> });
  };

  return (
    <FormProvider form={form}>
      <CheckboxGroup
        name="affected_systems"
        control="CHECKBOX_GROUP"
        type="keyword"
        label="Affected systems"
        isRequired={isRequired}
        metadata={{ options: OPTIONS }}
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('CheckboxGroup', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      expect(screen.getByText('Affected systems')).toBeInTheDocument();
    });

    it('renders a checkbox for each option', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      for (const option of OPTIONS) {
        expect(screen.getByLabelText(option)).toBeInTheDocument();
      }
    });

    it('starts with all checkboxes unchecked when no initialValue is provided', () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      for (const option of OPTIONS) {
        expect(screen.getByLabelText(option)).not.toBeChecked();
      }
    });

    it('pre-checks options from initialValue', () => {
      render(<FormWrapper initialValue={['frontend', 'backend']} onSubmitResult={jest.fn()} />);
      expect(screen.getByLabelText('frontend')).toBeChecked();
      expect(screen.getByLabelText('backend')).toBeChecked();
      expect(screen.getByLabelText('database')).not.toBeChecked();
    });

    it('ignores non-string items in the initial value array', () => {
      // Cast to bypass TS — simulates malformed YAML-parsed data at runtime
      render(
        <FormWrapper
          initialValue={['frontend', 42, null, true] as unknown as string[]}
          onSubmitResult={jest.fn()}
        />
      );
      expect(screen.getByLabelText('frontend')).toBeChecked();
      expect(screen.getByLabelText('backend')).not.toBeChecked();
      expect(screen.getByLabelText('database')).not.toBeChecked();
    });

    it('shows Optional label when isRequired is false', () => {
      render(<FormWrapper isRequired={false} onSubmitResult={jest.fn()} />);
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('does not show Optional label when isRequired is true', () => {
      render(<FormWrapper isRequired onSubmitResult={jest.fn()} />);
      expect(screen.queryByText('Optional')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('checks an option when clicked', async () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByLabelText('backend'));
      expect(screen.getByLabelText('backend')).toBeChecked();
    });

    it('unchecks a selected option when clicked again', async () => {
      render(<FormWrapper initialValue={['frontend']} onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByLabelText('frontend'));
      expect(screen.getByLabelText('frontend')).not.toBeChecked();
    });

    it('allows selecting multiple options independently', async () => {
      render(<FormWrapper onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByLabelText('frontend'));
      await userEvent.click(screen.getByLabelText('database'));
      expect(screen.getByLabelText('frontend')).toBeChecked();
      expect(screen.getByLabelText('backend')).not.toBeChecked();
      expect(screen.getByLabelText('database')).toBeChecked();
    });
  });

  describe('isRequired validation', () => {
    it('blocks form submission when isRequired is true and nothing is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('shows an error message when required validation fails', async () => {
      render(<FormWrapper isRequired onSubmitResult={jest.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });

    it('allows submission when isRequired is true and at least one option is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByLabelText('backend'));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows submission when isRequired is false and nothing is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired={false} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows submission when isRequired is true and initialValue has selections', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper isRequired initialValue={['frontend']} onSubmitResult={onSubmitResult} />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });
  });

  describe('submitted value', () => {
    it('submits selected options as a JSON string', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByLabelText('frontend'));
      await userEvent.click(screen.getByLabelText('database'));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.affected_systems_as_keyword;

      expect(typeof submitted).toBe('string');
      const parsed = JSON.parse(submitted as string);
      expect(parsed).toEqual(expect.arrayContaining(['frontend', 'database']));
      expect(parsed).toHaveLength(2);
    });

    it('submits an empty JSON array string when nothing is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.affected_systems_as_keyword;

      expect(submitted).toBe('[]');
    });
  });
});
