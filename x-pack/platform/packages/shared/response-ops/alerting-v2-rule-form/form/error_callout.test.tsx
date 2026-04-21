/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import type { FormValues } from './types';
import { ErrorCallOut } from './error_callout';

// Wrapper component that provides form context with configurable state
const TestWrapper = ({
  errors = {},
  isSubmitted = false,
  children,
}: {
  errors?: FieldErrors<FormValues>;
  isSubmitted?: boolean;
  children: React.ReactNode;
}) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      kind: 'alert',
      metadata: { name: '', enabled: false },
      timeField: '',
      schedule: { every: '', lookback: '' },
      evaluation: { query: { base: '' } },
    },
  });

  // Override formState with test values by spreading
  const methodsWithOverrides = {
    ...methods,
    formState: {
      ...methods.formState,
      errors,
      isSubmitted,
    },
  };

  return <FormProvider {...methodsWithOverrides}>{children}</FormProvider>;
};

describe('ErrorCallOut', () => {
  // Create mock errors - using 'as' cast since we're testing error display, not field names
  const createErrors = (
    errorMap: Record<string, { message?: string }>
  ): FieldErrors<FormValues> => {
    return errorMap as FieldErrors<FormValues>;
  };

  describe('when form is not submitted', () => {
    it('returns null even when there are errors', () => {
      const errors = createErrors({
        metadata: { message: 'Name is required' },
      });

      const { container } = render(
        <TestWrapper errors={errors} isSubmitted={false}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(container.querySelector('.euiCallOut')).toBeNull();
    });
  });

  describe('when form is submitted', () => {
    it('returns null when there are no errors', () => {
      const { container } = render(
        <TestWrapper errors={{}} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(container.querySelector('.euiCallOut')).toBeNull();
    });

    it('displays the error callout with a single error message', () => {
      const errors = createErrors({
        metadata: { message: 'Name is required' },
      });

      render(
        <TestWrapper errors={errors} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(screen.getByText('Please address the highlighted errors.')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('displays multiple error messages', () => {
      const errors = createErrors({
        metadata: { message: 'Name is required' },
        evaluation: { message: 'Query is invalid' },
        timeField: { message: 'Time field is required' },
      });

      render(
        <TestWrapper errors={errors} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Query is invalid')).toBeInTheDocument();
      expect(screen.getByText('Time field is required')).toBeInTheDocument();
    });

    it('filters out errors without messages', () => {
      const errors = createErrors({
        metadata: { message: 'Name is required' },
        evaluation: { message: undefined },
        timeField: { message: '' },
      });

      render(
        <TestWrapper errors={errors} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();

      // Should only have one list item (empty messages are filtered out)
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(1);
    });

    it('renders the callout with danger color', () => {
      const errors = createErrors({
        metadata: { message: 'Name is required' },
      });

      const { container } = render(
        <TestWrapper errors={errors} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      const callout = container.querySelector('.euiCallOut');
      expect(callout).toHaveClass('euiCallOut--danger');
    });

    it('scrolls the callout into view when errors are shown', () => {
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const errors = createErrors({
        metadata: { message: 'Name is required' },
      });

      render(
        <TestWrapper errors={errors} isSubmitted={true}>
          <ErrorCallOut />
        </TestWrapper>
      );

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  });
});
