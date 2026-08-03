/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

import { Form, useForm } from '../../../shared_imports';
import { useLoadInferenceEndpoints } from '../../../../../services/api';
import { SelectInferenceId } from './select_inference_id';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiPopover: ({
      button,
      children,
      isOpen,
    }: {
      button: React.ReactNode;
      children: React.ReactNode;
      isOpen: boolean;
    }) => (
      <div>
        {button}
        {isOpen ? <div data-test-subj="mockEuiPopoverPanel">{children}</div> : null}
      </div>
    ),
  };
});

jest.mock('@kbn/inference-endpoint-ui-common', () => {
  const SERVICE_PROVIDERS = {
    elastic: { name: 'Elastic' },
    openai: { name: 'OpenAI' },
  };

  const MockInferenceFlyoutWrapper = ({
    onFlyoutClose,
    onSubmitSuccess,
    allowedTaskTypes,
  }: {
    onFlyoutClose: () => void;
    onSubmitSuccess: (id: string) => void;
    http?: unknown;
    toasts?: unknown;
    isEdit?: boolean;
    enforceAdaptiveAllocations?: boolean;
    allowedTaskTypes?: InferenceTaskType[];
  }) => (
    <div data-test-subj="inference-flyout-wrapper">
      <button data-test-subj="mock-flyout-close" onClick={onFlyoutClose}>
        Close Flyout
      </button>
      <button
        data-test-subj="mock-flyout-submit"
        onClick={() => onSubmitSuccess('new-endpoint-id')}
      >
        Submit
      </button>
      {allowedTaskTypes && (
        <div data-test-subj="mock-allowed-task-types">{allowedTaskTypes.join(',')}</div>
      )}
    </div>
  );

  return {
    __esModule: true,
    default: MockInferenceFlyoutWrapper,
    SERVICE_PROVIDERS,
  };
});

jest.mock('../../../../../services/api', () => ({
  ...jest.requireActual('../../../../../services/api'),
  useLoadInferenceEndpoints: jest.fn(),
}));

const mockNavigateToUrl = jest.fn();

jest.mock('../../../../../app_context', () => ({
  ...jest.requireActual('../../../../../app_context'),
  useAppContext: jest.fn(() => ({
    core: {
      application: {
        navigateToUrl: mockNavigateToUrl,
      },
      http: {
        basePath: {
          get: jest.fn().mockReturnValue('/base-path'),
        },
      },
    },
    config: { enforceAdaptiveAllocations: false },
    services: {
      notificationService: {
        toasts: {},
      },
    },
    docLinks: {
      links: {
        inferenceManagement: {
          inferenceAPIDocumentation: 'https://abc.com/inference-api-create',
        },
      },
    },
    plugins: {
      cloud: { isCloudEnabled: false },
      share: {
        url: {
          locators: {
            get: jest.fn(() => ({ useUrl: jest.fn().mockReturnValue('https://redirect.me') })),
          },
        },
      },
    },
  })),
}));

const DEFAULT_ENDPOINTS: InferenceAPIConfigResponse[] = [
  {
    inference_id: defaultInferenceEndpoints.ELSER,
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: { model_id: 'elser' },
  },
  {
    inference_id: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
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

const mockResendRequest = jest.fn();

const setupInferenceEndpointsMocks = ({
  data = DEFAULT_ENDPOINTS,
  isLoading = false,
  error = null,
}: {
  data?: InferenceAPIConfigResponse[] | undefined;
  isLoading?: boolean;
  error?: ReturnType<typeof useLoadInferenceEndpoints>['error'];
} = {}) => {
  mockResendRequest.mockClear();
  jest.mocked(useLoadInferenceEndpoints).mockReturnValue({
    data,
    isInitialRequest: false,
    isLoading,
    error,
    resendRequest: mockResendRequest,
  });
};

function TestFormWrapper({
  children,
  initialValue = defaultInferenceEndpoints.ELSER,
}: {
  children: React.ReactElement;
  initialValue?: string;
}) {
  const { form } = useForm({
    defaultValue: initialValue !== undefined ? { inference_id: initialValue } : undefined,
  });

  return <Form form={form}>{children}</Form>;
}

const renderSelectInferenceId = async ({ initialValue }: { initialValue?: string } = {}) => {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      <TestFormWrapper initialValue={initialValue}>
        <SelectInferenceId data-test-subj="data-inference-endpoint-list" />
      </TestFormWrapper>
    );
  });
  return result!;
};

describe('SelectInferenceId', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
      delay: null,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('WHEN component is rendered', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD display the component with button', async () => {
      await renderSelectInferenceId();

      expect(await screen.findByTestId('selectInferenceId')).toBeInTheDocument();
      expect(await screen.findByTestId('inferenceIdButton')).toBeInTheDocument();
    });

    it('SHOULD display selected endpoint in button', async () => {
      await renderSelectInferenceId({ initialValue: '' });

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent(defaultInferenceEndpoints.ELSER);
    });
  });

  describe('WHEN popover button is clicked', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD open popover with management buttons', async () => {
      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));

      expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();
      expect(await screen.findByTestId('manageInferenceEndpointButton')).toBeInTheDocument();
    });

    describe('AND button is clicked again', () => {
      it('SHOULD close the popover', async () => {
        await renderSelectInferenceId();

        const toggle = await screen.findByTestId('inferenceIdButton');

        await user.click(toggle);
        expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

        await user.click(toggle);
        await waitFor(() => {
          expect(screen.queryByTestId('createInferenceEndpointButton')).not.toBeInTheDocument();
        });
      });
    });

    describe('AND "Add inference endpoint" button is clicked', () => {
      it('SHOULD close popover', async () => {
        await renderSelectInferenceId();

        await user.click(await screen.findByTestId('inferenceIdButton'));
        expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

        await user.click(await screen.findByTestId('createInferenceEndpointButton'));
        await waitFor(() => {
          expect(screen.queryByTestId('createInferenceEndpointButton')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('WHEN endpoint is created optimistically', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD display newly created endpoint even if not in loaded list', async () => {
      await renderSelectInferenceId({ initialValue: 'newly-created-endpoint' });

      await user.click(await screen.findByTestId('inferenceIdButton'));

      const newEndpoint = await screen.findByTestId('custom-inference_newly-created-endpoint');
      expect(newEndpoint).toBeInTheDocument();
      expect(newEndpoint).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('WHEN flyout is opened', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD show flyout when "Add inference endpoint" is clicked', async () => {
      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await user.click(await screen.findByTestId('createInferenceEndpointButton'));

      expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();
    });

    it('SHOULD pass allowedTaskTypes to restrict endpoint creation to compatible types', async () => {
      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await user.click(await screen.findByTestId('createInferenceEndpointButton'));

      const allowedTaskTypes = await screen.findByTestId('mock-allowed-task-types');
      expect(allowedTaskTypes).toHaveTextContent('text_embedding,sparse_embedding');
    });

    describe('AND flyout close is triggered', () => {
      it('SHOULD close the flyout', async () => {
        await renderSelectInferenceId();

        await user.click(await screen.findByTestId('inferenceIdButton'));
        await user.click(await screen.findByTestId('createInferenceEndpointButton'));
        expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();

        await user.click(await screen.findByTestId('mock-flyout-close'));

        expect(screen.queryByTestId('inference-flyout-wrapper')).not.toBeInTheDocument();
      });
    });

    describe('AND endpoint is successfully created', () => {
      it('SHOULD call resendRequest when submitted', async () => {
        await renderSelectInferenceId();

        await user.click(await screen.findByTestId('inferenceIdButton'));
        await user.click(await screen.findByTestId('createInferenceEndpointButton'));

        expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();

        await user.click(await screen.findByTestId('mock-flyout-submit'));

        expect(mockResendRequest).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('WHEN endpoint is selected from list', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD update form value with selected endpoint', async () => {
      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));

      const endpoint1 = await screen.findByTestId('custom-inference_endpoint-1');
      await user.click(endpoint1);

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('endpoint-1');
    });
  });

  describe('WHEN user searches for endpoints', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD filter endpoints based on search input', async () => {
      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));

      const searchInput = await screen.findByRole('combobox', {
        name: /Existing endpoints/i,
      });
      await user.clear(searchInput);
      await user.type(searchInput, 'endpoint-1');

      expect(await screen.findByTestId('custom-inference_endpoint-1')).toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_endpoint-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN endpoints are loading', () => {
    it('SHOULD display loading spinner', async () => {
      setupInferenceEndpointsMocks({ data: undefined, isLoading: true, error: null });

      await renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await screen.findByTestId('createInferenceEndpointButton');

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('WHEN endpoints list is empty', () => {
    it('SHOULD not set default value', async () => {
      setupInferenceEndpointsMocks({ data: [], isLoading: false, error: null });

      await renderSelectInferenceId({ initialValue: '' });

      const button = screen.getByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('No inference endpoint selected');
    });

    it('SHOULD display no endpoint selected message when no endpoints are returned', async () => {
      setupInferenceEndpointsMocks({ data: [], isLoading: false, error: null });

      await renderSelectInferenceId({ initialValue: '' });

      const button = screen.getByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('No inference endpoint selected');
    });
  });

  describe('WHEN only incompatible endpoints are available', () => {
    const incompatibleEndpoints: InferenceAPIConfigResponse[] = [
      { inference_id: 'incompatible-1', task_type: 'completion' },
      { inference_id: 'incompatible-2', task_type: 'rerank' },
    ] as InferenceAPIConfigResponse[];

    beforeEach(() => {
      setupInferenceEndpointsMocks({ data: incompatibleEndpoints });
    });

    it('SHOULD not display incompatible endpoints in list', async () => {
      await renderSelectInferenceId({ initialValue: '' });

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await screen.findByTestId('createInferenceEndpointButton');

      expect(screen.queryByTestId('custom-inference_incompatible-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_incompatible-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN API returns error', () => {
    it('SHOULD handle error gracefully and still render UI', async () => {
      setupInferenceEndpointsMocks({
        data: [],
        isLoading: false,
        error: {
          error: 'Failed to load endpoints',
          message: 'Failed to load endpoints',
        },
      });

      await renderSelectInferenceId();

      expect(screen.getByTestId('selectInferenceId')).toBeInTheDocument();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

      expect(screen.queryByTestId('custom-inference_endpoint-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_endpoint-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN component mounts with empty value', () => {
    it('SHOULD automatically select default endpoint', async () => {
      setupInferenceEndpointsMocks();

      await renderSelectInferenceId({ initialValue: '' });

      const button = await screen.findByTestId('inferenceIdButton');
      await waitFor(() => expect(button).toHaveTextContent(defaultInferenceEndpoints.ELSER));
    });

    describe('AND .elser-2-elasticsearch is available', () => {
      it('SHOULD prioritize .elser-2-elasticsearch over lower-priority endpoints', async () => {
        setupInferenceEndpointsMocks({
          data: [
            {
              inference_id: defaultInferenceEndpoints.ELSER,
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser' },
            },
            {
              inference_id: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser-2-elastic' },
            },
            {
              inference_id: 'endpoint-1',
              task_type: 'text_embedding',
              service: 'openai',
              service_settings: { model_id: 'text-embedding-3-large' },
            },
          ] as InferenceAPIConfigResponse[],
        });

        await renderSelectInferenceId({ initialValue: '' });

        const button = await screen.findByTestId('inferenceIdButton');
        await waitFor(() =>
          expect(button).toHaveTextContent(defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID)
        );
      });
    });
  });
});
