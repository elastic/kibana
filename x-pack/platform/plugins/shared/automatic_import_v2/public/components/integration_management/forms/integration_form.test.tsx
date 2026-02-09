/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { IntegrationFormProvider, useIntegrationForm } from './integration_form';
import type { IntegrationFormData } from './types';

const mockExistingPackageNames = ['existing_integration', 'my_custom_package', 'test_package'];

jest.mock('../../../common/lib/api', () => ({
  getInstalledPackages: jest.fn(() =>
    Promise.resolve({
      items: mockExistingPackageNames.map((id) => ({ id })),
    })
  ),
}));

const mockServices = coreMock.createStart();

// Test component that uses fields and exposes form state
const FormTestConsumer: React.FC<{ onSubmitResult?: (data: IntegrationFormData) => void }> = ({
  onSubmitResult,
}) => {
  const { isValid, submit } = useIntegrationForm();

  const handleSubmit = async () => {
    const result = await submit();
    if (result.isValid && result.data) {
      onSubmitResult?.(result.data);
    }
  };

  return (
    <div>
      <UseField path="title">
        {(field) => (
          <input
            data-test-subj="titleInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
            onBlur={() => field.setErrors([])}
          />
        )}
      </UseField>
      <UseField path="description">
        {(field) => (
          <input
            data-test-subj="descriptionInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <UseField path="connectorId">
        {(field) => (
          <input
            data-test-subj="connectorIdInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <UseField path="dataStreamTitle">
        {(field) => (
          <input
            data-test-subj="dataStreamTitleInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <UseField path="dataStreamDescription">
        {(field) => (
          <input
            data-test-subj="dataStreamDescriptionInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <UseField path="dataCollectionMethod">
        {(field) => (
          <input
            data-test-subj="dataCollectionMethodInput"
            value={(field.value as string[])?.join(',') || ''}
            onChange={(e) => field.setValue(e.target.value ? e.target.value.split(',') : [])}
          />
        )}
      </UseField>
      <UseField path="logsSourceOption">
        {(field) => (
          <input
            data-test-subj="logsSourceOptionInput"
            value={field.value as string}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <UseField path="logSample">
        {(field) => (
          <input
            data-test-subj="logSampleInput"
            value={(field.value as string) || ''}
            onChange={(e) => field.setValue(e.target.value)}
          />
        )}
      </UseField>
      <span data-test-subj="isValid">{String(isValid)}</span>
      <button data-test-subj="submitButton" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
};

interface RenderFormOptions {
  initialValue?: Partial<IntegrationFormData>;
  onSubmit?: jest.Mock;
  onSubmitResult?: (data: IntegrationFormData) => void;
}

const renderForm = (options: RenderFormOptions = {}) => {
  const {
    initialValue,
    onSubmit = jest.fn().mockResolvedValue(undefined),
    onSubmitResult,
  } = options;

  return {
    ...render(
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>
          <IntegrationFormProvider initialValue={initialValue} onSubmit={onSubmit}>
            <FormTestConsumer onSubmitResult={onSubmitResult} />
          </IntegrationFormProvider>
        </KibanaContextProvider>
      </I18nProvider>
    ),
    onSubmit,
  };
};

// Helper to advance past form debounce time (300ms)
const advancePastDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
};

const fillAllRequiredFields = async (getByTestId: (id: string) => HTMLElement) => {
  await act(async () => {
    fireEvent.change(getByTestId('titleInput'), { target: { value: 'My Integration' } });
    fireEvent.change(getByTestId('descriptionInput'), { target: { value: 'My Description' } });
    fireEvent.change(getByTestId('connectorIdInput'), { target: { value: 'connector-123' } });
    fireEvent.change(getByTestId('dataStreamTitleInput'), { target: { value: 'My Data Stream' } });
    fireEvent.change(getByTestId('dataStreamDescriptionInput'), {
      target: { value: 'My Data Stream Description' },
    });
    fireEvent.change(getByTestId('dataCollectionMethodInput'), { target: { value: 'filestream' } });
    fireEvent.change(getByTestId('logSampleInput'), { target: { value: 'sample log data' } });
  });
  await advancePastDebounce();
};

describe('IntegrationFormProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useIntegrationForm hook - isValid state', () => {
    it('should return isValid=false when fields are empty', async () => {
      const { getByTestId } = renderForm();

      await advancePastDebounce();

      expect(getByTestId('isValid').textContent).toBe('false');
    });

    it('should return isValid=false when only some fields are filled', async () => {
      const { getByTestId } = renderForm();

      await act(async () => {
        fireEvent.change(getByTestId('titleInput'), { target: { value: 'Only Has Title' } });
      });
      await advancePastDebounce();

      expect(getByTestId('isValid').textContent).toBe('false');
    });

    it('should return isValid=true when all required fields are filled', async () => {
      const { getByTestId } = renderForm();

      await fillAllRequiredFields(getByTestId);

      expect(getByTestId('isValid').textContent).toBe('true');
    });

    it('should return isValid=false when a required field is cleared', async () => {
      const { getByTestId } = renderForm();

      await fillAllRequiredFields(getByTestId);
      expect(getByTestId('isValid').textContent).toBe('true');

      // Clear the title with ''
      await act(async () => {
        fireEvent.change(getByTestId('titleInput'), { target: { value: '' } });
      });
      await advancePastDebounce();

      expect(getByTestId('isValid').textContent).toBe('false');
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with form data when all required fields are filled', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = renderForm({ onSubmit });

      await fillAllRequiredFields(getByTestId);

      await act(async () => {
        fireEvent.click(getByTestId('submitButton'));
      });
      await advancePastDebounce();

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Integration',
          description: 'My Description',
          connectorId: 'connector-123',
        })
      );
    });

    it('should not call onSubmit when form has validation errors', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = renderForm({ onSubmit });

      // Don't fill any fields, just try to submit
      await act(async () => {
        fireEvent.click(getByTestId('submitButton'));
      });
      await advancePastDebounce();

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
