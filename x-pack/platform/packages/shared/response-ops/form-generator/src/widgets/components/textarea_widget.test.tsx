/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextareaWidget } from './textarea_widget';
import { getMeta, setMeta } from '../../schema_connector_metadata';

const meta = { getMeta, setMeta };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

describe('TextareaWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a textarea with label and placeholder', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="notes"
          schema={z.string()}
          fieldProps={{
            label: 'Notes',
            euiFieldProps: {
              placeholder: 'Enter notes',
            },
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByText('Notes')).toBeDefined();
    const textarea = screen.getByPlaceholderText('Enter notes');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('displays the current value', () => {
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { notes: 'existing notes' } });
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="notes"
            schema={z.string()}
            fieldProps={{ label: 'Notes', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: () => undefined,
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const textarea = screen.getByDisplayValue('existing notes') as HTMLTextAreaElement;
    expect(textarea.value).toBe('existing notes');
  });

  it('updates value when input changes', () => {
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="notes"
            schema={z.string()}
            fieldProps={{ label: 'Notes', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: () => undefined,
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const textarea = screen.getByLabelText('Notes', { selector: 'textarea' });
    fireEvent.change(textarea, { target: { value: 'new notes' } });

    expect((textarea as HTMLTextAreaElement).value).toBe('new notes');
  });

  it('validates field on blur', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="notes"
            schema={z.string().min(3, 'Notes must be at least 3 characters')}
            fieldProps={{ label: 'Notes', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    const strValue = value as string;
                    if (!strValue || strValue.length < 3) {
                      return { message: 'Notes must be at least 3 characters' };
                    }
                  },
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const textarea = screen.getByLabelText('Notes', { selector: 'textarea' });
    await user.click(textarea);
    fireEvent.change(textarea, { target: { value: 'ab' } });
    await user.tab();

    await screen.findByText('Notes must be at least 3 characters');
  });
});
