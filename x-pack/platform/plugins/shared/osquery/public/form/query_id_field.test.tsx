/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';

import { QueryIdField } from './query_id_field';

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}> = ({ children, defaultValues }) => {
  const methods = useForm({ defaultValues: { id: '', ...defaultValues } });

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>
          {children}
          <button type="button" onClick={methods.handleSubmit(() => {})}>
            Submit
          </button>
        </FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('QueryIdField', () => {
  describe('ID uniqueness validation', () => {
    it('should show "ID must be unique" error when ID exists in idSet', async () => {
      const existingIds = new Set(['duplicate-test-query']);

      render(
        <FormWrapper>
          <QueryIdField idSet={existingIds} />
        </FormWrapper>
      );

      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'duplicate-test-query' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('ID must be unique')).toBeInTheDocument();
      });
    });

    it('should not show uniqueness error when ID is not in idSet', async () => {
      const existingIds = new Set(['duplicate-test-query']);

      render(
        <FormWrapper>
          <QueryIdField idSet={existingIds} />
        </FormWrapper>
      );

      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'new-unique-query' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.queryByText('ID must be unique')).not.toBeInTheDocument();
      });
    });

    it('should show "ID is required" error when ID is empty', async () => {
      const existingIds = new Set(['some-query']);

      render(
        <FormWrapper>
          <QueryIdField idSet={existingIds} />
        </FormWrapper>
      );

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('ID is required')).toBeInTheDocument();
      });
    });

    it('should show pattern error for invalid characters', async () => {
      const existingIds = new Set<string>();

      render(
        <FormWrapper>
          <QueryIdField idSet={existingIds} />
        </FormWrapper>
      );

      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'invalid.id.with.dots' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Characters must be alphanumeric, _, or -')).toBeInTheDocument();
      });
    });
  });
});
