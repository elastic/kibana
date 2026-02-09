/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  installConsoleTruncationWarningFilter,
  mockResendRequest,
  renderSelectInferenceId,
  setupInferenceEndpointsMocks,
} from './select_inference_id.helpers';

const mockDispatch = jest.fn();
const mockNavigateToUrl = jest.fn();

const mockIsAtLeast = jest.fn((level: string) => {
  // Default: enterprise license, so all levels return true
  // Individual tests can override this mock implementation
  return true;
});

jest.mock('../../../public/application/app_context', () => ({
  ...jest.requireActual('../../../public/application/app_context'),
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
      share: {
        url: {
          locators: {
            get: jest.fn((id) => {
              const { INFERENCE_LOCATOR, createMockLocator } = jest.requireActual(
                './select_inference_id.helpers'
              ) as typeof import('./select_inference_id.helpers');
              if (id === INFERENCE_LOCATOR) {
                return createMockLocator();
              }
              throw new Error(`Unknown locator id: ${id}`);
            }),
          },
        },
      },
    },
  })),
}));

jest.mock(
  '../../../public/application/components/component_templates/component_templates_context',
  () => ({
    ...jest.requireActual(
      '../../../public/application/components/component_templates/component_templates_context'
    ),
    useComponentTemplatesContext: jest.fn(() => ({
      toasts: {
        addError: jest.fn(),
        addSuccess: jest.fn(),
      },
    })),
  })
);

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context', () => ({
  ...jest.requireActual(
    '../../../public/application/components/mappings_editor/mappings_state_context'
  ),
  useMappingsState: () => ({ inferenceToModelIdMap: {} }),
  useDispatch: () => mockDispatch,
}));

jest.mock('@kbn/inference-endpoint-ui-common', () => {
  const SERVICE_PROVIDERS = {
    elastic: { name: 'Elastic' },
    openai: { name: 'OpenAI' },
  };

  const MockInferenceFlyoutWrapper = ({
    onFlyoutClose,
    onSubmitSuccess,
  }: {
    onFlyoutClose: () => void;
    onSubmitSuccess: (id: string) => void;
    http?: unknown;
    toasts?: unknown;
    isEdit?: boolean;
    enforceAdaptiveAllocations?: boolean;
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
    </div>
  );

  return {
    __esModule: true,
    default: MockInferenceFlyoutWrapper,
    SERVICE_PROVIDERS,
  };
});

jest.mock('../../../public/application/services/api', () => ({
  ...jest.requireActual('../../../public/application/services/api'),
  useLoadInferenceEndpoints: jest.fn(),
}));

jest.mock('../../../public/hooks/use_license', () => ({
  useLicense: jest.fn(() => ({
    isLoading: false,
    isAtLeast: mockIsAtLeast,
  })),
}));

let user: ReturnType<typeof userEvent.setup>;

let restoreConsoleErrorFilter: () => void;

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  user = userEvent.setup();
  restoreConsoleErrorFilter = installConsoleTruncationWarningFilter();
  // Reset to default: enterprise license (all levels return true)
  mockIsAtLeast.mockImplementation(() => true);
});

afterEach(async () => {
  restoreConsoleErrorFilter();
});

describe('SelectInferenceId', () => {
  describe('WHEN component is rendered', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD display the component with button', async () => {
      renderSelectInferenceId();

      expect(await screen.findByTestId('selectInferenceId')).toBeInTheDocument();
      expect(await screen.findByTestId('inferenceIdButton')).toBeInTheDocument();
    });

    it('SHOULD display selected endpoint in button', async () => {
      renderSelectInferenceId();

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('.preconfigured-elser');
    });

    it('SHOULD prioritize ELSER endpoint as default selection', async () => {
      renderSelectInferenceId();

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('.preconfigured-elser');
      expect(button).not.toHaveTextContent('endpoint-1');
      expect(button).not.toHaveTextContent('endpoint-2');
    });
  });

  describe('WHEN popover button is clicked', () => {
    beforeEach(() => {
      setupInferenceEndpointsMocks();
    });

    it('SHOULD open popover with management buttons', async () => {
      renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));

      expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();
      expect(await screen.findByTestId('manageInferenceEndpointButton')).toBeInTheDocument();
    });

    describe('AND button is clicked again', () => {
      it('SHOULD close the popover', async () => {
        renderSelectInferenceId();

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
        renderSelectInferenceId();

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
      renderSelectInferenceId({ initialValue: 'newly-created-endpoint' });

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
      renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await user.click(await screen.findByTestId('createInferenceEndpointButton'));

      expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();
    });

    describe('AND flyout close is triggered', () => {
      it('SHOULD close the flyout', async () => {
        renderSelectInferenceId();

        await user.click(await screen.findByTestId('inferenceIdButton'));
        await user.click(await screen.findByTestId('createInferenceEndpointButton'));
        expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();

        await user.click(await screen.findByTestId('mock-flyout-close'));

        expect(screen.queryByTestId('inference-flyout-wrapper')).not.toBeInTheDocument();
      });
    });

    describe('AND endpoint is successfully created', () => {
      it('SHOULD call resendRequest when submitted', async () => {
        renderSelectInferenceId();

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
      renderSelectInferenceId();

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
      renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));

      const searchInput = await screen.findByRole('combobox', {
        name: /Existing endpoints/i,
      });
      fireEvent.change(searchInput, { target: { value: 'endpoint-1' } });

      expect(await screen.findByTestId('custom-inference_endpoint-1')).toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_endpoint-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN endpoints are loading', () => {
    it('SHOULD display loading spinner', async () => {
      setupInferenceEndpointsMocks({ data: undefined, isLoading: true, error: null });

      renderSelectInferenceId();

      await user.click(await screen.findByTestId('inferenceIdButton'));
      await screen.findByTestId('createInferenceEndpointButton');

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('WHEN endpoints list is empty', () => {
    it('SHOULD not set default value', async () => {
      setupInferenceEndpointsMocks({ data: [], isLoading: false, error: null });

      renderSelectInferenceId({ initialValue: '' });

      const button = screen.getByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('No inference endpoint selected');
    });

    it('SHOULD display "No inference endpoint selected" message', () => {
      setupInferenceEndpointsMocks({ data: [], isLoading: false, error: null });

      renderSelectInferenceId({ initialValue: '' });

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
      renderSelectInferenceId({ initialValue: '' });

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

      renderSelectInferenceId();

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

      renderSelectInferenceId({ initialValue: '' });

      const button = await screen.findByTestId('inferenceIdButton');
      await waitFor(() => expect(button).toHaveTextContent('.preconfigured-elser'));
    });

    describe('AND .elser-2-elastic is available', () => {
      it('SHOULD prioritize .elser-2-elastic over other endpoints IF has enterprise license', async () => {
        setupInferenceEndpointsMocks({
          data: [
            {
              inference_id: '.elser-2-elastic',
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser-2-elastic' },
            },
            {
              inference_id: '.preconfigured-elser',
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser' },
            },
            {
              inference_id: 'endpoint-1',
              task_type: 'text_embedding',
              service: 'openai',
              service_settings: { model_id: 'text-embedding-3-large' },
            },
          ] as InferenceAPIConfigResponse[],
        });

        renderSelectInferenceId({ initialValue: '' });

        const button = await screen.findByTestId('inferenceIdButton');
        await waitFor(() => expect(button).toHaveTextContent('.elser-2-elastic'));
      });

      it('SHOULD fall back to .preconfigured-elser instead of .elser-2-elastic IF has NO enterprise license', async () => {
        // Mock license to return false for enterprise
        mockIsAtLeast.mockImplementation((level: string) => level !== 'enterprise');

        setupInferenceEndpointsMocks({
          data: [
            {
              inference_id: '.elser-2-elastic',
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser-2-elastic' },
            },
            {
              inference_id: '.preconfigured-elser',
              task_type: 'sparse_embedding',
              service: 'elastic',
              service_settings: { model_id: 'elser' },
            },
            {
              inference_id: 'endpoint-1',
              task_type: 'text_embedding',
              service: 'openai',
              service_settings: { model_id: 'text-embedding-3-large' },
            },
          ] as InferenceAPIConfigResponse[],
        });

        renderSelectInferenceId({ initialValue: '' });

        const button = await screen.findByTestId('inferenceIdButton');
        await waitFor(() => expect(button).toHaveTextContent('.preconfigured-elser'));
        expect(button).not.toHaveTextContent('.elser-2-elastic');
      });
    });
  });
});
