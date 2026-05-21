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
import { Textarea } from './textarea';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiMarkdownEditor: ({
      value,
      onChange,
      'aria-label': ariaLabel,
      'data-test-subj': dataTestSubj,
    }: {
      value: string;
      onChange: (value: string) => void;
      'aria-label': string;
      'data-test-subj': string;
    }) => (
      <textarea
        data-test-subj={dataTestSubj}
        aria-label={ariaLabel}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    ),
  };
});

interface FormWrapperProps {
  isRequired?: boolean;
  markdown?: boolean;
  initialValue?: string;
  patternValidation?: { regex: string; message?: string };
  minLengthValue?: number;
  maxLengthValue?: number;
  onSubmitResult: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  markdown,
  initialValue,
  patternValidation,
  minLengthValue,
  maxLengthValue,
  onSubmitResult,
}) => {
  const form = useForm({
    defaultValues: {
      [CASE_EXTENDED_FIELDS]: initialValue ? { details_as_keyword: initialValue } : {},
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
      <Textarea
        name="details"
        control="TEXTAREA"
        type="keyword"
        label="Details"
        isRequired={isRequired}
        metadata={markdown !== undefined ? { markdown } : undefined}
        patternValidation={patternValidation}
        minLength={minLengthValue}
        maxLength={maxLengthValue}
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('Textarea', () => {
  describe('plain mode (no markdown)', () => {
    it('renders EuiTextArea when markdown is not set', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.queryByTestId('template-field-markdown-editor')).not.toBeInTheDocument();
    });

    it('renders the label', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      expect(screen.getByText('Details')).toBeInTheDocument();
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

    it('submits the typed value', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper onSubmitResult={onSubmitResult} />);

      await userEvent.type(screen.getByRole('textbox'), 'Hello world');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submittedValue = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.details_as_keyword;
      expect(submittedValue).toBe('Hello world');
    });
  });

  describe('markdown mode', () => {
    it('renders MarkdownEditor when metadata.markdown is true', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper markdown onSubmitResult={onSubmitResult} />);

      expect(screen.getByTestId('template-field-markdown-editor')).toBeInTheDocument();
    });

    it('renders EuiTextArea when metadata.markdown is false', () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper markdown={false} onSubmitResult={onSubmitResult} />);

      expect(screen.queryByTestId('template-field-markdown-editor')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('submits the typed value from markdown editor', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper markdown onSubmitResult={onSubmitResult} />);

      const editor = screen.getByTestId('template-field-markdown-editor');
      await userEvent.type(editor, '## Title');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submittedValue = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.details_as_keyword;
      expect(submittedValue).toBe('## Title');
    });

    it('renders with pre-populated value', () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper markdown initialValue="# Existing content" onSubmitResult={onSubmitResult} />
      );

      const editor = screen.getByTestId('template-field-markdown-editor');
      expect(editor).toHaveValue('# Existing content');
    });
  });

  describe('validation', () => {
    it('blocks submission when isRequired is true and value is empty', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('shows error message when required validation fails', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });

    it('blocks submission when isRequired is true and value is empty in markdown mode', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired markdown onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('allows submission when isRequired is true and value is pre-populated', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper isRequired initialValue="Some content" onSubmitResult={onSubmitResult} />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('validates minLength', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper minLengthValue={10} initialValue="ab" onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('validates maxLength', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          maxLengthValue={5}
          initialValue="too long text"
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('validates pattern', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          patternValidation={{ regex: '^[A-Z]', message: 'Must start with uppercase' }}
          initialValue="lowercase"
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });
  });
});
