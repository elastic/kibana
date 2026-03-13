/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import {
  Form,
  useForm,
} from '../../../public/application/components/mappings_editor/shared_imports';
import type { SelectInferenceIdProps } from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';
import { SelectInferenceId } from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';
import { useLoadInferenceEndpoints } from '../../../public/application/services/api';

export const INFERENCE_LOCATOR = 'SEARCH_INFERENCE_ENDPOINTS';

export const createMockLocator = () => ({
  useUrl: jest.fn().mockReturnValue('https://redirect.me/to/inference_endpoints'),
});

export const mockResendRequest = jest.fn();

export const DEFAULT_ENDPOINTS: InferenceAPIConfigResponse[] = [
  {
    inference_id: '.preconfigured-elser',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: { model_id: 'elser' },
  },
  {
    inference_id: '.preconfigured-e5',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: { model_id: 'e5' },
  },
  {
    inference_id: 'endpoint-1',
    task_type: 'text_embedding',
    service: 'openai',
    service_settings: { model_id: 'text-embedding-3-large' },
  },
  {
    inference_id: 'endpoint-2',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: { model_id: 'elser' },
  },
] as InferenceAPIConfigResponse[];

export const defaultProps: SelectInferenceIdProps = {
  'data-test-subj': 'data-inference-endpoint-list',
};

export function TestFormWrapper({
  children,
  initialValue = '.preconfigured-elser',
}: {
  children: React.ReactElement;
  initialValue?: string;
}) {
  const { form } = useForm({
    defaultValue: initialValue ? { inference_id: initialValue } : undefined,
  });

  return <Form form={form}>{children}</Form>;
}

export function setupInferenceEndpointsMocks({
  data = DEFAULT_ENDPOINTS,
  isLoading = false,
  error = null,
}: {
  data?: InferenceAPIConfigResponse[] | undefined;
  isLoading?: boolean;
  error?: ReturnType<typeof useLoadInferenceEndpoints>['error'];
} = {}) {
  const useLoadInferenceEndpointsMock = jest.mocked(useLoadInferenceEndpoints);

  mockResendRequest.mockClear();
  useLoadInferenceEndpointsMock.mockReturnValue({
    data,
    isInitialRequest: false,
    isLoading,
    error,
    resendRequest: mockResendRequest,
  });
}

export const renderSelectInferenceId = ({
  initialValue,
  props = defaultProps,
}: {
  initialValue?: string;
  props?: SelectInferenceIdProps;
} = {}) =>
  render(
    <TestFormWrapper initialValue={initialValue}>
      <SelectInferenceId {...props} />
    </TestFormWrapper>
  );

export const installConsoleTruncationWarningFilter = () => {
  // eslint-disable-next-line no-console
  const originalConsoleError = console.error;
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((message?: unknown, ...rest: unknown[]) => {
      const isTruncationWarning =
        typeof message === 'string' &&
        message.includes('The truncation ellipsis is larger than the available width');

      if (isTruncationWarning) {
        return;
      }
      originalConsoleError(message, ...rest);
    });

  return () => {
    consoleErrorSpy.mockRestore();
  };
};
