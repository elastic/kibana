/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  Form,
  useForm,
} from '../../../public/application/components/mappings_editor/shared_imports';
import type { SelectInferenceIdProps } from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';
import { SelectInferenceId } from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';

const mockDispatch = jest.fn();
const mockNavigateToUrl = jest.fn();
const INFERENCE_LOCATOR = 'SEARCH_INFERENCE_ENDPOINTS';

const createMockLocator = () => ({
  useUrl: jest.fn().mockReturnValue('https://redirect.me/to/inference_endpoints'),
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

const mockResendRequest = jest.fn();

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
    <button data-test-subj="mock-flyout-submit" onClick={() => onSubmitSuccess('new-endpoint-id')}>
      Submit
    </button>
  </div>
);

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  __esModule: true,
  default: MockInferenceFlyoutWrapper,
}));

jest.mock('../../../public/application/services/api', () => ({
  ...jest.requireActual('../../../public/application/services/api'),
  useLoadInferenceEndpoints: jest.fn(),
}));

const DEFAULT_ENDPOINTS: InferenceAPIConfigResponse[] = [
  { inference_id: '.preconfigured-elser', task_type: 'sparse_embedding' },
  { inference_id: '.preconfigured-e5', task_type: 'text_embedding' },
  { inference_id: 'endpoint-1', task_type: 'text_embedding' },
  { inference_id: 'endpoint-2', task_type: 'sparse_embedding' },
] as InferenceAPIConfigResponse[];

function TestFormWrapper({
  children,
  initialValue = '.preconfigured-elser',
}: {
  children: React.ReactElement;
  initialValue?: string;
}) {
  const { form } = useForm();

  React.useEffect(() => {
    if (initialValue) {
      form.setFieldValue('inference_id', initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Form form={form}>{children}</Form>;
}

function setupMocks(
  data: InferenceAPIConfigResponse[] | undefined = DEFAULT_ENDPOINTS,
  isLoading: boolean = false,
  error: Error | null = null
) {
  const { useLoadInferenceEndpoints } = jest.requireMock(
    '../../../public/application/services/api'
  );

  mockResendRequest.mockClear();
  useLoadInferenceEndpoints.mockReturnValue({
    data,
    isLoading,
    error,
    resendRequest: mockResendRequest,
  });
}

const defaultProps: SelectInferenceIdProps = {
  'data-test-subj': 'data-inference-endpoint-list',
};

const flushPendingTimers = async () => {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
};

const actClick = async (element: Element) => {
  // EUI's popover positioning happens async (via MutationObserver/requestAnimationFrame).
  // When a test ends, RTL unmounts the component but those async callbacks are
  // already queued. They still fire after unmount, trying to setState on a
  // now-dead component, which triggers React's "update not wrapped in
  // act(...)" warning in the next test's setup. Running a test in isolation
  // usually doesn't show it because timing works out differently. This helper
  // clicks, then flushes pending timers so the popover's async work completes
  // before the test ends.
  fireEvent.click(element);
  await flushPendingTimers();
};

let consoleErrorSpy: jest.SpyInstance;
let originalConsoleError: typeof console.error;

beforeAll(() => {
  /* eslint-disable no-console */
  originalConsoleError = console.error;
  consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((message?: unknown, ...rest: unknown[]) => {
      if (
        typeof message === 'string' &&
        message.includes('The truncation ellipsis is larger than the available width')
      ) {
        return;
      }
      originalConsoleError(message, ...rest);
    });
  /* eslint-enable no-console */
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  const { useLoadInferenceEndpoints } = jest.requireMock(
    '../../../public/application/services/api'
  );
  useLoadInferenceEndpoints.mockReset();
});

afterEach(async () => {
  await flushPendingTimers();
  jest.useRealTimers();
});

describe('SelectInferenceId', () => {
  describe('WHEN component is rendered', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD display the component with button', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      expect(await screen.findByTestId('selectInferenceId')).toBeInTheDocument();
      expect(await screen.findByTestId('inferenceIdButton')).toBeInTheDocument();
    });

    it('SHOULD display selected endpoint in button', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('.preconfigured-elser');
    });

    it('SHOULD prioritize ELSER endpoint as default selection', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('.preconfigured-elser');
      expect(button).not.toHaveTextContent('endpoint-1');
      expect(button).not.toHaveTextContent('endpoint-2');
    });
  });

  describe('WHEN popover button is clicked', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD open popover with management buttons', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));

      expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();
      expect(await screen.findByTestId('manageInferenceEndpointButton')).toBeInTheDocument();
    });

    describe('AND button is clicked again', () => {
      it('SHOULD close the popover', async () => {
        render(
          <TestFormWrapper>
            <SelectInferenceId {...defaultProps} />
          </TestFormWrapper>
        );

        const toggle = await screen.findByTestId('inferenceIdButton');

        await actClick(toggle);
        expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

        await actClick(toggle);
        expect(screen.queryByTestId('createInferenceEndpointButton')).not.toBeInTheDocument();
      });
    });

    describe('AND "Add inference endpoint" button is clicked', () => {
      it('SHOULD close popover', async () => {
        render(
          <TestFormWrapper>
            <SelectInferenceId {...defaultProps} />
          </TestFormWrapper>
        );

        await actClick(await screen.findByTestId('inferenceIdButton'));
        expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

        await actClick(await screen.findByTestId('createInferenceEndpointButton'));
        expect(screen.queryByTestId('createInferenceEndpointButton')).not.toBeInTheDocument();
      });
    });
  });

  describe('WHEN endpoint is created optimistically', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD display newly created endpoint even if not in loaded list', async () => {
      render(
        <TestFormWrapper initialValue="newly-created-endpoint">
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));

      const newEndpoint = await screen.findByTestId('custom-inference_newly-created-endpoint');
      expect(newEndpoint).toBeInTheDocument();
      expect(newEndpoint).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('WHEN flyout is opened', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD show flyout when "Add inference endpoint" is clicked', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));
      await actClick(await screen.findByTestId('createInferenceEndpointButton'));

      expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();
    });

    describe('AND flyout close is triggered', () => {
      it('SHOULD close the flyout', async () => {
        render(
          <TestFormWrapper>
            <SelectInferenceId {...defaultProps} />
          </TestFormWrapper>
        );

        await actClick(await screen.findByTestId('inferenceIdButton'));
        await actClick(await screen.findByTestId('createInferenceEndpointButton'));
        expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();

        await actClick(await screen.findByTestId('mock-flyout-close'));

        expect(screen.queryByTestId('inference-flyout-wrapper')).not.toBeInTheDocument();
      });
    });

    describe('AND endpoint is successfully created', () => {
      it('SHOULD call resendRequest when submitted', async () => {
        render(
          <TestFormWrapper>
            <SelectInferenceId {...defaultProps} />
          </TestFormWrapper>
        );

        await actClick(await screen.findByTestId('inferenceIdButton'));
        await actClick(await screen.findByTestId('createInferenceEndpointButton'));

        expect(await screen.findByTestId('inference-flyout-wrapper')).toBeInTheDocument();

        await actClick(await screen.findByTestId('mock-flyout-submit'));

        expect(mockResendRequest).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('WHEN endpoint is selected from list', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD update form value with selected endpoint', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));

      const endpoint1 = await screen.findByTestId('custom-inference_endpoint-1');
      await actClick(endpoint1);

      const button = await screen.findByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('endpoint-1');
    });
  });

  describe('WHEN user searches for endpoints', () => {
    beforeEach(() => {
      setupMocks();
    });

    it('SHOULD filter endpoints based on search input', async () => {
      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));

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
      setupMocks(undefined, true, null);

      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));
      await screen.findByTestId('createInferenceEndpointButton');

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('WHEN endpoints list is empty', () => {
    it('SHOULD not set default value', async () => {
      setupMocks([], false, null);

      render(
        <TestFormWrapper initialValue="">
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await flushPendingTimers();

      const button = screen.getByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('No inference endpoint selected');
    });

    it('SHOULD display "No inference endpoint selected" message', () => {
      setupMocks([], false, null);

      render(
        <TestFormWrapper initialValue="">
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

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
      setupMocks(incompatibleEndpoints);
    });

    it('SHOULD not display incompatible endpoints in list', async () => {
      render(
        <TestFormWrapper initialValue="">
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await actClick(await screen.findByTestId('inferenceIdButton'));
      await screen.findByTestId('createInferenceEndpointButton');

      expect(screen.queryByTestId('custom-inference_incompatible-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_incompatible-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN API returns error', () => {
    it('SHOULD handle error gracefully and still render UI', async () => {
      setupMocks([], false, new Error('Failed to load endpoints'));

      render(
        <TestFormWrapper>
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      expect(screen.getByTestId('selectInferenceId')).toBeInTheDocument();

      await actClick(await screen.findByTestId('inferenceIdButton'));
      expect(await screen.findByTestId('createInferenceEndpointButton')).toBeInTheDocument();

      expect(screen.queryByTestId('custom-inference_endpoint-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('custom-inference_endpoint-2')).not.toBeInTheDocument();
    });
  });

  describe('WHEN component mounts with empty value', () => {
    it('SHOULD automatically select default endpoint', async () => {
      setupMocks();

      render(
        <TestFormWrapper initialValue="">
          <SelectInferenceId {...defaultProps} />
        </TestFormWrapper>
      );

      await flushPendingTimers();

      const button = screen.getByTestId('inferenceIdButton');
      expect(button).toHaveTextContent('.preconfigured-elser');
    });

    describe('AND .elser-2-elastic is available', () => {
      it('SHOULD prioritize .elser-2-elastic over other endpoints', async () => {
        setupMocks([
          { inference_id: '.elser-2-elastic', task_type: 'sparse_embedding' },
          { inference_id: '.preconfigured-elser', task_type: 'sparse_embedding' },
          { inference_id: 'endpoint-1', task_type: 'text_embedding' },
        ] as InferenceAPIConfigResponse[]);

        render(
          <TestFormWrapper initialValue="">
            <SelectInferenceId {...defaultProps} />
          </TestFormWrapper>
        );

        await flushPendingTimers();

        const button = screen.getByTestId('inferenceIdButton');
        expect(button).toHaveTextContent('.elser-2-elastic');
      });
    });
  });
});
