/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { Form, useForm, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { InferenceEndpointIdField } from './inference_endpoint_id_field';
import type { Config } from '../types/types';

const INITIAL_INFERENCE_ID = 'hello';

const defaultConfig = {
  inferenceId: INITIAL_INFERENCE_ID,
  provider: 'openai',
  taskType: 'text_embedding',
} as Config;

/**
 * Mirrors how InferenceServiceFormFields wires this component: config comes from
 * useFormData in the parent while the field writes via the form context.
 */
const InferenceEndpointIdFieldInner: React.FC = () => {
  const [{ config }] = useFormData<{ config: Config }>({
    watch: ['config.inferenceId'],
  });

  return (
    <InferenceEndpointIdField config={config ?? defaultConfig} selectedTaskType="text_embedding" />
  );
};

const InferenceEndpointIdFieldHarness: React.FC = () => {
  const { form } = useForm({
    defaultValue: {
      config: defaultConfig,
    },
  });

  return (
    <I18nProvider>
      <Form form={form}>
        <InferenceEndpointIdFieldInner />
      </Form>
    </I18nProvider>
  );
};

describe('InferenceEndpointIdField', () => {
  it('preserves cursor position when editing in the middle of the inference ID', async () => {
    const user = userEvent.setup();
    render(<InferenceEndpointIdFieldHarness />);

    const input = (await screen.findByTestId('inference-endpoint-input-field')) as HTMLInputElement;
    expect(input).toHaveValue(INITIAL_INFERENCE_ID);

    await user.click(input);
    input.setSelectionRange(2, 2); // cursor between 'e' and 'l' in "hello"
    expect(input.selectionStart).toBe(2);

    await user.keyboard('X');

    await waitFor(() => {
      expect(input).toHaveValue('heXllo');
    });
    // Cursor must stay after the inserted character, not jump to the end
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it('updates the API reference as the inference ID changes', async () => {
    const user = userEvent.setup();
    render(<InferenceEndpointIdFieldHarness />);

    const input = await screen.findByTestId('inference-endpoint-input-field');
    await user.clear(input);
    await user.type(input, 'my-endpoint');

    expect(await screen.findByText('_inference/text_embedding/my-endpoint')).toBeInTheDocument();
  });
});
