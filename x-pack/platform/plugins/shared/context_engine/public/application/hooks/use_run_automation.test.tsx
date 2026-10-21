/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RunWorkflowResponseDto } from '@kbn/workflows';
import type { RunWorkflowParams } from '@kbn/workflows-ui';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useRunAutomation } from './use_run_automation';

const mockMutate = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

type HttpError = IHttpFetchError<ResponseErrorBody>;

interface RunWorkflowHookOptions {
  onSuccess: (data: RunWorkflowResponseDto, variables: RunWorkflowParams) => void;
  onError: (error: HttpError) => void;
}

let capturedRunWorkflowOptions: RunWorkflowHookOptions | undefined;

const createRunFailedHttpError = (): HttpError => {
  const body: ResponseErrorBody = { message: 'run failed', statusCode: 500 };
  return Object.assign(new Error('run failed'), {
    name: 'HttpFetchError',
    request: new Request('http://localhost'),
    body,
  });
};

jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: (options: RunWorkflowHookOptions) => {
    capturedRunWorkflowOptions = options;
    return {
      mutate: mockMutate,
      isLoading: false,
    };
  },
}));

const renderUseRunAutomation = () => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockReturnValue('/app/workflows/wf-1');
  core.notifications.toasts.addSuccess = mockAddSuccess;
  core.notifications.toasts.addError = mockAddError;

  const { result } = renderHook(() => useRunAutomation(), {
    wrapper: ({ children }) => (
      <I18nProvider>
        <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
      </I18nProvider>
    ),
  });

  return { core, result };
};

describe('useRunAutomation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedRunWorkflowOptions = undefined;
  });

  it('delegates runAutomation to useRunWorkflow mutate', () => {
    const { result } = renderUseRunAutomation();

    result.current.runAutomation('workflow-1', { ticketId: 'T-1' });

    expect(mockMutate).toHaveBeenCalledWith({ id: 'workflow-1', inputs: { ticketId: 'T-1' } });
  });

  it('shows a success toast with a view-execution link when the run succeeds', () => {
    renderUseRunAutomation();

    capturedRunWorkflowOptions?.onSuccess(
      { workflowExecutionId: 'exec-123' },
      { id: 'workflow-1', inputs: {} }
    );

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Workflow run started',
        actionProps: expect.objectContaining({
          primary: expect.objectContaining({
            children: 'View execution',
            href: '/app/workflows/wf-1',
          }),
        }),
      })
    );
  });

  it('shows an error toast when the run fails', () => {
    renderUseRunAutomation();
    const error = createRunFailedHttpError();

    capturedRunWorkflowOptions?.onError(error);

    expect(mockAddError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        title: 'Unable to run workflow',
        toastMessage: 'run failed',
      })
    );
  });
});
