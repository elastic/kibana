/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { addMeta } from '../../../schema_connector_metadata';
import { MultiOptionUnionWidget } from './multi_option_union_widget';

describe('MultiOptionUnionWidget - Serializer/Deserializer Integration', () => {
  // Simulates a connector schema with secrets discriminated union
  const createSchema = () => {
    const noneOption = z.object({ authType: z.literal('none') });
    addMeta(noneOption, { label: 'None' });

    const basicOption = z.object({
      authType: z.literal('basic'),
      username: z.string(),
      password: z.string(),
    });
    addMeta(basicOption, { label: 'Basic Auth' });

    const bearerOption = z.object({
      authType: z.literal('bearer'),
      token: z.string(),
    });
    addMeta(bearerOption, { label: 'Bearer Token' });

    return z.object({
      config: z.object({
        url: z.string(),
        authType: z.string().optional(),
      }),
      secrets: z.discriminatedUnion('authType', [noneOption, basicOption, bearerOption]),
    });
  };

  // Simulates the deserializer that reconstructs secrets from config
  const deserializer = (apiData: any) => {
    if (!apiData?.config?.authType || apiData.secrets?.authType) {
      return apiData;
    }

    // Reconstruct secrets from config.authType
    return {
      ...apiData,
      secrets: { authType: apiData.config.authType },
    };
  };

  // Simulates the serializer that copies authType to config
  const serializer = (formData: any) => {
    if (!formData?.secrets?.authType) {
      return formData;
    }

    return {
      ...formData,
      config: {
        ...formData.config,
        authType: formData.secrets.authType,
      },
    };
  };

  const TestComponent = ({ initialData }: { initialData: any }) => {
    const schema = createSchema();
    const { form } = useForm({
      defaultValue: initialData,
      serializer,
      deserializer,
    });

    return (
      <Form form={form}>
        <MultiOptionUnionWidget
          path="secrets"
          options={schema.shape.secrets.options}
          discriminatorKey="authType"
          schema={schema.shape.secrets}
          fieldConfig={{
            defaultValue: undefined,
            validations: [{ validator: () => undefined }],
          }}
          fieldProps={{ label: 'Authentication', euiFieldProps: {} }}
          formConfig={{}}
        />
        <button
          type="button"
          onClick={async () => {
            const { data } = await form.submit();
            // Expose serialized data for testing
            (window as any).serializedData = data;
          }}
        >
          Submit
        </button>
      </Form>
    );
  };

  beforeEach(() => {
    (window as any).serializedData = undefined;
  });

  it('should initialize from async form data (deserializer)', async () => {
    const apiData = {
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: {}, // Secrets are stripped by API
    };

    render(<TestComponent initialData={apiData} />);

    await waitFor(() => {
      const basicCard = screen.getByLabelText('Basic Auth');
      expect(basicCard).toBeChecked();
    });
  });

  it('should not overwrite user selection when form re-renders (ref flag pattern)', async () => {
    const apiData = {
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: {},
    };

    const { rerender } = render(<TestComponent initialData={apiData} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Basic Auth')).toBeChecked();
    });

    await userEvent.click(screen.getByLabelText('Bearer Token'));

    await waitFor(() => {
      expect(screen.getByLabelText('Bearer Token')).toBeChecked();
    });

    // simulating parent re-render
    rerender(<TestComponent initialData={apiData} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Bearer Token')).toBeChecked();
    });
  });
});
