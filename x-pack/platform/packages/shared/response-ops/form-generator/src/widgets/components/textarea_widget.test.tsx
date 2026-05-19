/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextareaWidget } from './textarea_widget';
import { getMeta, setMeta, addMeta } from '@kbn/connector-specs/src/connector_spec_ui';

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

  it('renders a textarea with the given label and placeholder', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="certificate"
          schema={z.string()}
          fieldProps={{
            label: 'Certificate (PEM)',
            euiFieldProps: {
              placeholder: '-----BEGIN CERTIFICATE-----',
            },
          }}
          fieldConfig={{
            validations: [{ validator: () => undefined }],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Certificate (PEM)') as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(screen.getByPlaceholderText('-----BEGIN CERTIFICATE-----')).toBeDefined();
  });

  it('displays the current value', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----';
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { certificate: pem } });
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="certificate"
            schema={z.string()}
            fieldProps={{ label: 'Certificate', euiFieldProps: {} }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Certificate') as HTMLTextAreaElement;
    expect(input.value).toBe(pem);
  });

  it('updates value when textarea changes', () => {
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="certificate"
            schema={z.string()}
            fieldProps={{ label: 'Certificate', euiFieldProps: {} }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Certificate') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'new-pem' } });
    expect(input.value).toBe('new-pem');
  });

  it('allows overriding euiFieldProps (e.g. rows)', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="certificate"
          schema={z.string()}
          fieldProps={{
            label: 'Certificate',
            euiFieldProps: { rows: 12 },
          }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Certificate') as HTMLTextAreaElement;
    expect(input.rows).toBe(12);
  });
});

describe('TextareaWidget - sensitive mode (schema has sensitive: true)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sensitiveSchema = () => {
    const schema = z.string();
    addMeta(schema, { sensitive: true });
    return schema;
  };

  it('renders a textarea with show/hide toggle', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={sensitiveSchema()}
          fieldProps={{ label: 'Private key', euiFieldProps: {} }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(screen.getByTestId('sensitiveTextareaToggle')).toBeDefined();
  });

  it('starts in masked mode', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={sensitiveSchema()}
          fieldProps={{ label: 'Private key', euiFieldProps: {} }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key');
    expect(input.getAttribute('data-is-masked')).toBe('true');
    expect(screen.getByLabelText('Show secret')).toBeDefined();
  });

  it('toggles masking off when the reveal button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={sensitiveSchema()}
          fieldProps={{ label: 'Private key', euiFieldProps: {} }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key');
    const toggle = screen.getByTestId('sensitiveTextareaToggle');

    expect(input.getAttribute('data-is-masked')).toBe('true');
    await user.click(toggle);
    expect(input.getAttribute('data-is-masked')).toBe('false');
    expect(screen.getByLabelText('Hide secret')).toBeDefined();
  });

  it('displays and updates the field value', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----';
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { privateKey: pem } });
      return (
        <Form form={form}>
          <TextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={sensitiveSchema()}
            fieldProps={{ label: 'Private key', euiFieldProps: {} }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(input.value).toBe(pem);

    fireEvent.change(input, { target: { value: 'new-key' } });
    expect(input.value).toBe('new-key');
  });

  it('invokes a caller-provided callback inputRef and keeps masking applied', () => {
    const callerRef = jest.fn();

    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={sensitiveSchema()}
          fieldProps={{ label: 'Private key', euiFieldProps: { inputRef: callerRef } }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(callerRef).toHaveBeenCalledWith(input);
    expect(input.getAttribute('data-is-masked')).toBe('true');
  });

  it('passes caller-provided style through to the textarea', () => {
    render(
      <TestFormWrapper>
        <TextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={sensitiveSchema()}
          fieldProps={{
            label: 'Private key',
            euiFieldProps: { style: { backgroundColor: 'rgb(240, 240, 240)' } },
          }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(input.style.backgroundColor).toBe('rgb(240, 240, 240)');
  });
});
