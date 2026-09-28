/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { BooleanWidget } from './boolean_widget';
import { getMeta, setMeta } from '@kbn/connector-specs/src/connector_spec_ui';

const meta = { getMeta, setMeta };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('BooleanWidget', () => {
  it('renders a switch and toggles the value', async () => {
    const user = userEvent.setup();
    let latestValue: unknown;

    const TestForm = () => {
      const { form } = useForm({ defaultValue: { unfurlLinks: false } });
      latestValue = form.getFormData().unfurlLinks;
      return (
        <Form form={form}>
          <BooleanWidget
            meta={meta}
            formConfig={{}}
            path="unfurlLinks"
            schema={z.boolean()}
            fieldProps={{
              label: 'Unfurl Links',
              euiFieldProps: { ['data-test-subj']: 'generator-field-unfurlLinks' },
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
          />
        </Form>
      );
    };

    const { rerender } = render(<TestForm />, { wrapper });
    const toggle = screen.getByTestId('generator-field-unfurlLinks');
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);
    rerender(<TestForm />);
    expect(latestValue).toBe(true);
  });

  it('respects disabled', () => {
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { enabled: true } });
      return (
        <Form form={form}>
          <BooleanWidget
            meta={meta}
            formConfig={{ disabled: true }}
            path="enabled"
            schema={z.boolean()}
            fieldProps={{
              label: 'Enabled',
              euiFieldProps: {
                disabled: true,
                ['data-test-subj']: 'generator-field-enabled',
              },
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });
    expect(screen.getByTestId('generator-field-enabled')).toBeDisabled();
  });
});
