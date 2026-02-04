/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleTypeModel } from '@kbn/alerts-ui-shared';
import { RuleTypeModalComponent } from '.';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { testQueryClientConfig } from '@kbn/response-ops-rules-apis/test_utils';

const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock useDebounceFn to execute immediately without debouncing
jest.mock('@kbn/react-hooks', () => ({
  useDebounceFn: (fn: any) => {
    // Return the function itself as 'run' - it's already stable
    return {
      run: fn,
      cancel: () => {},
      flush: () => {},
    };
  },
}));

jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_rule_types_query', () => ({
  useGetRuleTypesQuery: jest.fn().mockImplementation(() => ({
    data: [
      {
        id: 'ruleType1',
        name: 'ruleType1',
        description: 'The first test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType2',
        name: 'ruleType2',
        description: 'The second test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType3',
        name: 'ruleType3',
        description: 'The third test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType4',
        name: 'ruleType4',
        description: 'The fourth test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType5',
        name: 'ruleType5',
        description: 'The fifth test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
    ],
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    isInitialLoading: false,
    error: null,
  })),
}));

function render(ui: React.ReactElement) {
  const queryClient = new QueryClient(testQueryClientConfig);
  return rtlRender(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe('RuleTypeModalComponent', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectRuleType = jest.fn();
  const mockOnSelectTemplate = jest.fn();
  const mockHttpGet = jest.fn();
  const mockToastsAddDanger = jest.fn();
  const mockHttp = {
    get: mockHttpGet,
  } as unknown as jest.Mocked<HttpStart>;
  const mockToasts = {
    addDanger: mockToastsAddDanger,
  } as unknown as jest.Mocked<ToastsStart>;

  const ruleTypes: RuleTypeModel[] = [
    {
      id: 'ruleType1',
      description: 'The first test rule type',
      iconClass: 'beaker',
      documentationUrl: 'https://example.com/docs/ruleType1',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 1 Params</div>,
      requiresAppContext: false,
    },
    {
      id: 'ruleType2',
      description: 'The second test rule type',
      iconClass: 'alert',
      documentationUrl: 'https://example.com/docs/ruleType2',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 2 Params</div>,
      requiresAppContext: true,
    },
    {
      id: 'ruleType3',
      description: 'The third test rule type',
      iconClass: 'gear',
      documentationUrl: 'https://example.com/docs/ruleType3',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 3 Params</div>,
      requiresAppContext: false,
    },
    {
      id: 'ruleType4',
      description: 'The fourth test rule type',
      iconClass: 'clock',
      documentationUrl: 'https://example.com/docs/ruleType4',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 4 Params</div>,
      requiresAppContext: true,
    },
    {
      id: 'ruleType5',
      description: 'The fifth test rule type',
      iconClass: 'check',
      documentationUrl: 'https://example.com/docs/ruleType5',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 5 Params</div>,
      requiresAppContext: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet.mockReset();
    mockToastsAddDanger.mockReset();
    jest.useRealTimers(); // Ensure clean timer state
  });

  afterEach(() => {
    jest.useRealTimers(); // Clean up any fake timers
  });

  it('modal should only contain registered rule types that do not require app context', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelectRuleType}
        onSelectTemplate={mockOnSelectTemplate}
        filteredRuleTypes={[]}
        registeredRuleTypes={ruleTypes}
        http={mockHttp}
        toasts={mockToasts}
      />
    );

    expect(screen.getByText('Create new rule')).toBeInTheDocument();
    // all rules that do not require app context should be present
    ruleTypes.forEach((ruleType) => {
      if (ruleType.requiresAppContext) {
        expect(screen.queryByText(ruleType.description)).not.toBeInTheDocument();
      } else {
        expect(screen.getByText(ruleType.description)).toBeInTheDocument();
      }
    });
  });

  it('should call onClose when the close button is clicked', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelectRuleType}
        onSelectTemplate={mockOnSelectTemplate}
        filteredRuleTypes={[]}
        registeredRuleTypes={ruleTypes}
        http={mockHttp}
        toasts={mockToasts}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not render the modal when isOpen is false', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelectRuleType}
        onSelectTemplate={mockOnSelectTemplate}
        filteredRuleTypes={[]}
        http={mockHttp}
        registeredRuleTypes={ruleTypes}
        toasts={mockToasts}
      />
    );

    expect(screen.queryByText('Select a Rule Type')).not.toBeInTheDocument();
  });

  describe('Template Mode', () => {
    const mockTemplatesResponse = {
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'template-1',
          name: 'Test Template 1',
          tags: ['tag1', 'tag2'],
          rule_type_id: 'ruleType1',
          params: {},
          schedule: { interval: '1m' },
        },
        {
          id: 'template-2',
          name: 'Test Template 2',
          tags: ['tag3'],
          rule_type_id: 'ruleType3',
          params: {},
          schedule: { interval: '5m' },
        },
      ],
    };

    const switchToTemplateMode = async () => {
      const buttons = screen.getAllByRole('button');
      const templateButton = buttons.find((btn) => btn.textContent === 'Template');
      if (templateButton) {
        await userEvent.click(templateButton);
      }
    };

    it('should fetch templates when switching to template mode', async () => {
      mockHttpGet.mockResolvedValue(mockTemplatesResponse);

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      // Wait for the API call
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith('/internal/alerting/rule_template/_find', {
          query: {
            per_page: 10,
            page: 1,
            sort_field: 'name',
            sort_order: 'asc',
            search: undefined,
          },
        });
      });

      // Templates should be rendered
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument();
        expect(screen.getByText('Test Template 2')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching templates', async () => {
      // Mock a pending promise that we can control
      let resolveTemplates: any;
      mockHttpGet.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveTemplates = () => resolve(mockTemplatesResponse);
          })
      );

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      // Should show loading spinner immediately
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Resolve the promise
      resolveTemplates();

      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument();
      });
    });

    it('should call API with search term when search input changes', async () => {
      mockHttpGet.mockResolvedValue(mockTemplatesResponse);

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledTimes(1);
      });

      mockHttpGet.mockClear();

      // Change search input value
      const searchBox = screen.getByPlaceholderText(/search templates/i);
      // Use fireEvent for instant value change (faster than userEvent.type)
      fireEvent.change(searchBox, { target: { value: 'test' } });

      // Should call API with search term
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith('/internal/alerting/rule_template/_find', {
          query: expect.objectContaining({
            search: 'test',
            page: 1, // Should reset to page 1 on search
          }),
        });
      });
    });

    it('should load more templates via infinite scroll', async () => {
      // Set up mock to return different data based on page parameter
      mockHttpGet.mockImplementation((url, options) => {
        const page = options?.query?.page || 1;
        if (page === 1) {
          return Promise.resolve({
            ...mockTemplatesResponse,
            total: 20,
          });
        } else if (page === 2) {
          return Promise.resolve({
            page: 2,
            per_page: 10,
            total: 20,
            data: [
              {
                id: 'template-3',
                name: 'Test Template 3',
                tags: [],
                rule_type_id: 'ruleType1',
                params: {},
                schedule: { interval: '10m' },
              },
            ],
          });
        }
        return Promise.resolve(mockTemplatesResponse);
      });

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      // Wait for initial templates to load
      await waitFor(() => {
        expect(screen.queryByText('Test Template 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Template 2')).toBeInTheDocument();
        expect(screen.queryByText('Test template 3')).not.toBeInTheDocument();
      });

      // Get the callback passed to IntersectionObserver
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];

      // Simulate intersection
      observerCallback([{ isIntersecting: true }]);

      // Verify HTTP was called with page 2
      await waitFor(() => {
        const calls = mockHttpGet.mock.calls;
        // Should be called with page 2 (may be called multiple times due to React rendering)
        const page2Calls = calls.filter(([url, opts]) => opts?.query?.page === 2);
        expect(page2Calls.length).toBeGreaterThan(0);
      });

      // Both original and new templates should be visible (templates are appended)
      await waitFor(() => {
        expect(screen.getByText('Test Template 3')).toBeInTheDocument();
      });

      // Verify all three templates are present
      expect(screen.getByText('Test Template 1')).toBeInTheDocument();
      expect(screen.getByText('Test Template 2')).toBeInTheDocument();
      expect(screen.getByText('Test Template 3')).toBeInTheDocument();
    });

    it('should handle template API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch templates';
      mockHttpGet.mockRejectedValue(new Error(errorMessage));

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      // Should show error toast
      await waitFor(() => {
        expect(mockToastsAddDanger).toHaveBeenCalledWith({
          title: 'Unable to load rule templates',
          text: errorMessage,
        });
      });
    });

    it('should call onSelectTemplate when template is clicked', async () => {
      mockHttpGet.mockResolvedValue(mockTemplatesResponse);

      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      await switchToTemplateMode();

      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument();
      });

      // Click on a template
      const templateCard = screen.getByTestId('template-1-SelectOption');
      await userEvent.click(templateCard);

      expect(mockOnSelectTemplate).toHaveBeenCalledWith('template-1');
    });

    it('should not fetch templates when in rule type mode', () => {
      render(
        <RuleTypeModalComponent
          onClose={mockOnClose}
          onSelectRuleType={mockOnSelectRuleType}
          onSelectTemplate={mockOnSelectTemplate}
          filteredRuleTypes={[]}
          registeredRuleTypes={ruleTypes}
          http={mockHttp}
          toasts={mockToasts}
        />
      );

      // Should be in rule type mode by default
      expect(screen.getByText('The first test rule type')).toBeInTheDocument();

      // Should not have fetched templates
      expect(mockHttpGet).not.toHaveBeenCalled();
    });
  });
});
