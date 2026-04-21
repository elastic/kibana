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
import { SecretTextareaWidget } from './secret_textarea_widget';
import { getMeta, setMeta } from '@kbn/connector-specs/src/connector_spec_ui';

const meta = { getMeta, setMeta };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

describe('SecretTextareaWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a textarea with label and show/hide toggle', () => {
    render(
      <TestFormWrapper>
        <SecretTextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={z.string()}
          fieldProps={{ label: 'Private key', euiFieldProps: {} }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(screen.getByTestId('secretTextareaToggle')).toBeDefined();
  });

  it('starts in masked mode', () => {
    render(
      <TestFormWrapper>
        <SecretTextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={z.string()}
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
        <SecretTextareaWidget
          meta={meta}
          formConfig={{}}
          path="privateKey"
          schema={z.string()}
          fieldProps={{ label: 'Private key', euiFieldProps: {} }}
          fieldConfig={{ validations: [{ validator: () => undefined }] }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const input = screen.getByLabelText('Private key');
    const toggle = screen.getByTestId('secretTextareaToggle');

    expect(input.getAttribute('data-is-masked')).toBe('true');

    await user.click(toggle);

    expect(input.getAttribute('data-is-masked')).toBe('false');
    expect(screen.getByLabelText('Hide secret')).toBeDefined();
  });

  it('displays the current value', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----';
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { privateKey: pem } });
      return (
        <Form form={form}>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string()}
            fieldProps={{ label: 'Private key', euiFieldProps: {} }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    expect(input.value).toBe(pem);
  });

  it('updates value when the textarea changes', () => {
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string()}
            fieldProps={{ label: 'Private key', euiFieldProps: {} }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'new-key-value' } });
    expect(input.value).toBe('new-key-value');
  });

  it('displays error messages from field validations', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string().min(1, 'Private key is required')}
            fieldProps={{ label: 'Private key', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    if (!value) {
                      return { message: 'Private key is required' };
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

    const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, 'x');
    await user.clear(input);
    await user.tab();

    expect(await screen.findByText('Private key is required')).toBeDefined();
  });

  describe('ref composition with caller-provided euiFieldProps.inputRef', () => {
    it('invokes a caller-provided callback inputRef AND keeps masking applied', () => {
      const callerRef = jest.fn();

      render(
        <TestFormWrapper>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string()}
            fieldProps={{
              label: 'Private key',
              euiFieldProps: { inputRef: callerRef },
            }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
      expect(callerRef).toHaveBeenCalledWith(input);
      expect(input.getAttribute('data-is-masked')).toBe('true');
    });

    it('populates a caller-provided object inputRef AND keeps masking applied', () => {
      const callerRef = React.createRef<HTMLTextAreaElement>();

      render(
        <TestFormWrapper>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string()}
            fieldProps={{
              label: 'Private key',
              euiFieldProps: { inputRef: callerRef },
            }}
            fieldConfig={{ validations: [{ validator: () => undefined }] }}
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const input = screen.getByLabelText('Private key') as HTMLTextAreaElement;
      expect(callerRef.current).toBe(input);
      expect(input.getAttribute('data-is-masked')).toBe('true');
    });

    it('merges caller-provided style with the internal monospace fontFamily', () => {
      render(
        <TestFormWrapper>
          <SecretTextareaWidget
            meta={meta}
            formConfig={{}}
            path="privateKey"
            schema={z.string()}
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
      expect(input.style.fontFamily).toBe('monospace');
      expect(input.style.backgroundColor).toBe('rgb(240, 240, 240)');
    });
  });
});
