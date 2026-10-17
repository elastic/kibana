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

import { Form, useForm } from '../../../../../../shared_imports';
import { documentationService } from '../../../../../services';
import { getProcessorDescriptor } from '../../shared';
import { Fail } from './fail';

const FormWrapper = ({ onSubmit }: { onSubmit: jest.Mock }) => {
  const { form } = useForm({ defaultValue: { fields: {} } });

  return (
    <I18nProvider>
      <Form form={form}>
        <Fail />
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

describe('Fail processor fields', () => {
  beforeAll(() => {
    documentationService.setup(docLinksServiceMock.createStartContract());
  });

  it('SHOULD register the Fail fields component', () => {
    expect(getProcessorDescriptor('fail')?.FieldsComponent).toBe(Fail);
  });

  describe('WHEN the message is empty', () => {
    it('SHOULD reject the form with the required-message error', async () => {
      const onSubmit = jest.fn();
      render(<FormWrapper onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText('A message is required.')).toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
    });
  });

  describe('WHEN the message is provided', () => {
    it('SHOULD submit the message as form data', async () => {
      const onSubmit = jest.fn();
      render(<FormWrapper onSubmit={onSubmit} />);

      fireEvent.change(within(screen.getByTestId('messageField')).getByTestId('input'), {
        target: { value: 'Test Error Message' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: { fields: { message: 'Test Error Message' } },
          isValid: true,
        });
      });
    });
  });
});
