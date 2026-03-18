/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InferenceServiceFormFields,
  isProviderForSolutions,
} from './inference_service_form_fields';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { mockProviders } from '../utils/mock_providers';
import type { InferenceProvider } from '../types/types';
import { INTERNAL_OVERRIDE_FIELDS } from '../constants';

// Create a stable cloned copy for each test suite to prevent mutations from affecting other tests
// Note: Variable must be prefixed with 'mock' to be allowed in jest.mock()
let mockClonedProviders: InferenceProvider[];

jest.mock('../hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    data: mockClonedProviders,
  })),
}));

const httpMock = httpServiceMock.createStartContract();
const notificationsMock = notificationServiceMock.createStartContract();

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();

  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

interface RenderFormOptions {
  enforceAdaptiveAllocations?: boolean;
}

const renderForm = (options: RenderFormOptions = {}) => {
  const { enforceAdaptiveAllocations } = options;

  return render(
    <MockFormProvider>
      <InferenceServiceFormFields
        http={httpMock}
        toasts={notificationsMock.toasts}
        config={{ enforceAdaptiveAllocations }}
      />
    </MockFormProvider>
  );
};

// FLAKY: https://github.com/elastic/kibana/issues/253331
describe.skip('Inference Services', () => {
  // Reset cloned providers before each test to prevent mutation pollution
  beforeEach(() => {
    mockClonedProviders = JSON.parse(JSON.stringify(mockProviders));
  });
  it('renders', () => {
    renderForm();

    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('renders Selectable', async () => {
    renderForm();

    await userEvent.click(screen.getByTestId('provider-select'));
    expect(screen.getByTestId('euiSelectableList')).toBeInTheDocument();
  });

  it('renders Elastic at top', async () => {
    renderForm();

    await userEvent.click(screen.getByTestId('provider-select'));
    const listItems = screen.getAllByTestId('provider');
    expect(listItems[0]).toHaveTextContent('Elastic');
  });

  it('renders selected provider fields - hugging_face', async () => {
    renderForm();

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Hugging Face'));

    expect(screen.getByTestId('provider-select')).toHaveValue('Hugging Face');
    expect(screen.getByTestId('api_key-password')).toBeInTheDocument();
    expect(screen.getByTestId('url-input')).toBeInTheDocument();
    expect(screen.getByTestId('taskTypeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('inference-endpoint-input-field')).toBeInTheDocument();
    expect(screen.queryByTestId('inference-endpoint-input-field')).toHaveDisplayValue(
      /hugging_face-text_embedding/
    );
  });

  it('re-renders fields when selected to anthropic from hugging_face', async () => {
    renderForm();

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Hugging Face'));
    expect(screen.getByTestId('provider-select')).toHaveValue('Hugging Face');

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Anthropic'));

    expect(screen.getByTestId('provider-select')).toHaveValue('Anthropic');
    expect(screen.getByTestId('api_key-password')).toBeInTheDocument();
    expect(screen.getByTestId('model_id-input')).toBeInTheDocument();
    expect(screen.getByTestId('taskTypeSelectSingle')).toBeInTheDocument();
    expect(screen.getByTestId('inference-endpoint-input-field')).toBeInTheDocument();
    expect(screen.queryByTestId('inference-endpoint-input-field')).toHaveDisplayValue(
      /anthropic-completion/
    );
  });

  it('populates default model_id when selecting openai provider', async () => {
    renderForm();

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('OpenAI'));

    expect(screen.getByTestId('provider-select')).toHaveValue('OpenAI');
    const modelIdInput = screen.getByTestId('model_id-input');
    // Default value comes from INTERNAL_OVERRIDE_FIELDS.openai.defaultValues.model_id
    const expectedDefaultModel = INTERNAL_OVERRIDE_FIELDS.openai?.defaultValues?.model_id as string;
    expect(modelIdInput).toHaveValue(expectedDefaultModel);
  });

  describe('isProviderForSolutions', () => {
    it('should return true for provider with supported filter type', () => {
      const provider = { service: 'amazonbedrock', name: 'Amazon Bedrock' } as InferenceProvider;
      expect(isProviderForSolutions('security', provider)).toBe(true);
    });

    it('should return false for provider without supported filter type', () => {
      const provider = {
        service: 'amazon_sagemaker',
        name: 'Amazon SageMaker',
      } as InferenceProvider;
      expect(isProviderForSolutions('security', provider)).toBe(false);
    });
  });

  describe('Serverless adaptive allocations', () => {
    describe('when enforceAdaptiveAllocations is true (serverless)', () => {
      it('shows max_number_of_allocations field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: true });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // max_number_of_allocations should be visible in serverless
        expect(screen.getByTestId('max_number_of_allocations-number')).toBeInTheDocument();
      });

      it('hides num_allocations field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: true });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // num_allocations should be hidden in serverless
        expect(screen.queryByTestId('num_allocations-number')).not.toBeInTheDocument();
      });

      it('hides num_threads field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: true });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // num_threads should be hidden in serverless
        expect(screen.queryByTestId('num_threads-number')).not.toBeInTheDocument();
      });

      it('shows adaptive resources title for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: true });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // Adaptive resources title should be shown in serverless
        expect(screen.getByTestId('maxNumberOfAllocationsDetailsLabel')).toBeInTheDocument();
      });
    });

    describe('when enforceAdaptiveAllocations is false (non-serverless)', () => {
      it('shows num_allocations field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: false });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // num_allocations should be visible in non-serverless
        expect(screen.getByTestId('num_allocations-number')).toBeInTheDocument();
      });

      it('shows num_threads field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: false });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // num_threads should be visible in non-serverless
        expect(screen.getByTestId('num_threads-number')).toBeInTheDocument();
      });

      it('does not show max_number_of_allocations field for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: false });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // max_number_of_allocations should NOT be visible in non-serverless
        expect(screen.queryByTestId('max_number_of_allocations-number')).not.toBeInTheDocument();
      });

      it('does not show adaptive resources title for Elasticsearch provider', async () => {
        renderForm({ enforceAdaptiveAllocations: false });

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // Adaptive resources title should NOT be shown in non-serverless
        expect(screen.queryByTestId('maxNumberOfAllocationsDetailsLabel')).not.toBeInTheDocument();
      });
    });

    describe('when enforceAdaptiveAllocations is not provided (defaults to false)', () => {
      it('shows num_allocations field for Elasticsearch provider', async () => {
        renderForm();

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // num_allocations should be visible when enforceAdaptiveAllocations is not set
        expect(screen.getByTestId('num_allocations-number')).toBeInTheDocument();
      });

      it('does not show max_number_of_allocations field for Elasticsearch provider', async () => {
        renderForm();

        await userEvent.click(screen.getByTestId('provider-select'));
        await userEvent.click(screen.getByText('Elasticsearch'));

        expect(screen.getByTestId('provider-select')).toHaveValue('Elasticsearch');
        // max_number_of_allocations should NOT be visible when enforceAdaptiveAllocations is not set
        expect(screen.queryByTestId('max_number_of_allocations-number')).not.toBeInTheDocument();
      });
    });
  });
});
