/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import '@kbn/code-editor-mock/jest_helper';

import { Form, useForm } from '../../../../../../shared_imports';
import { documentationService } from '../../../../../services';
import { getProcessorDescriptor } from '../../shared';
import { Foreach } from './foreach';

const FormWrapper = ({ onSubmit }: { onSubmit: jest.Mock }) => {
  const { form } = useForm({ defaultValue: { fields: {} } });

  return (
    <I18nProvider>
      <Form form={form}>
        <Foreach />
        <button
          type="button"
          onClick={async () => {
            onSubmit(await form.submit());
          }}
        >
          Submit
        </button>
      </Form>
    </I18nProvider>
  );
};

describe('Foreach processor fields', () => {
  beforeAll(() => {
    documentationService.setup(docLinksServiceMock.createStartContract());
  });

  it('SHOULD register the Foreach fields component', () => {
    expect(getProcessorDescriptor('foreach')?.FieldsComponent).toBe(Foreach);
  });

  describe('WHEN the field is empty', () => {
    it('SHOULD reject the form with the required-field error', async () => {
      const onSubmit = jest.fn();
      render(<FormWrapper onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText('A field value is required.')).toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
    });
  });

  describe('WHEN only the field is provided', () => {
    it('SHOULD submit the field and omit the empty processor', async () => {
      const onSubmit = jest.fn();
      render(<FormWrapper onSubmit={onSubmit} />);

      fireEvent.change(within(screen.getByTestId('fieldNameField')).getByTestId('input'), {
        target: { value: 'test_foreach_processor' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: { fields: { field: 'test_foreach_processor' } },
          isValid: true,
        });
      });
    });
  });
});
