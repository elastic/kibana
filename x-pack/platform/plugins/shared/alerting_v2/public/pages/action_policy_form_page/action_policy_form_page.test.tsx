/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionPolicyFormPage } from './action_policy_form_page';
import { useActionPolicyAutoAttach } from '@kbn/alerting-v2-browser-shared';
import { createMockLocators, MockLocatorProvider } from '../../test_utils/test_providers';

const mockLocators = createMockLocators();

const mockNavigateToUrl = vi.fn();
const mockBasePath = { prepend: vi.fn((path: string) => `/mock${path}`) };
const mockGetUrlForApp = vi.fn(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
);

vi.mock('../../components/action_policy/form/components/matcher_input', () => {
  const mocked = {
    MatcherInput: (props: {
      value: string;
      onChange: (v: string) => void;
      'data-test-subj'?: string;
    }) => (
      <input
        data-test-subj={props['data-test-subj']}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../application/breadcrumb_context', () => {
  const mocked = {
    useSetBreadcrumbs: () => vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/core-di-browser', () => {
  return {
    useService: vi.fn((token: unknown) => {
      const tokenStr = String(token);
      if (tokenStr.includes('application')) {
        return {
          navigateToUrl: mockNavigateToUrl,
          capabilities: {},
          getUrlForApp: mockGetUrlForApp,
        };
      }
      if (tokenStr.includes('chrome')) {
        return { docTitle: { change: vi.fn() } };
      }
      if (tokenStr.includes('http')) {
        return { basePath: mockBasePath };
      }
      if (tokenStr.includes('uiSettings')) {
        return { get: () => true };
      }
      if (tokenStr.includes('notifications')) {
        return { toasts: { addError: vi.fn(), addSuccess: vi.fn() } };
      }
      return {};
    }),
    CoreStart: vi.fn((name: string) => `CoreStart(${name})`),
  };
});

const INLINE_DEFS = [
  {
    id: 'email',
    label: 'Email',
    iconType: 'mail',
    connectorTypeId: '.email',
    paramsTemplate: 'to: ""\n',
  },
  {
    id: 'slack',
    label: 'Slack',
    iconType: 'logoSlack',
    connectorTypeId: '.slack',
    paramsTemplate: 'message: ""\n',
  },
];

vi.mock('@kbn/alerting-v2-rule-form', () => {
  const mocked = {
    INLINE_ACTION_STEP_DEFINITIONS: INLINE_DEFS,
    getInlineActionStepDefinition: (id: string) => INLINE_DEFS.find((d) => d.id === id),
    buildInlineWorkflowYaml: () => 'workflow: yaml',
    isActionValid: (action: {
      source: 'existing' | 'inline';
      workflowId?: string | null;
      connectorId?: string | null;
      params?: string;
    }) =>
      action.source === 'existing'
        ? Boolean(action.workflowId)
        : action.connectorId != null && (action.params ?? '').trim() !== '',
    InlineWorkflowEditor: ({
      value,
      onChange,
      connectorCreationConfig,
    }: {
      value: { id: string; connectorId: string | null; params: string };
      onChange: (next: { id: string; connectorId: string | null; params: string }) => void;
      connectorCreationConfig?: { mode: string; href?: string };
    }) => (
      <div
        data-test-subj={`inlineWorkflowEditor-${value.id}`}
        data-connector-creation-mode={connectorCreationConfig?.mode}
        data-connector-creation-href={connectorCreationConfig?.href}
      >
        <button
          type="button"
          data-test-subj={`inlineFill-${value.id}`}
          onClick={() => onChange({ ...value, connectorId: 'connector-x', params: 'message: hi' })}
        >
          fill
        </button>
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockCreateInlineWorkflows = vi.fn();
const mockRollbackWorkflows = vi.fn();

vi.mock('@kbn/alerting-v2-browser-shared', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/alerting-v2-browser-shared')),
    useActionPolicyAutoAttach: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_create_action_policy', () => {
  const mocked = {
    useCreateActionPolicy: () => ({
      mutateAsync: mockCreateMutateAsync,
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_update_action_policy', () => {
  const mocked = {
    useUpdateActionPolicy: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_create_inline_workflows', () => {
  const mocked = {
    useCreateInlineWorkflows: () => ({
      createInlineWorkflows: mockCreateInlineWorkflows,
      rollbackWorkflows: mockRollbackWorkflows,
    }),
  };
  return { ...mocked, default: mocked };
});

let mockIsLicenseValid = true;
vi.mock('../../hooks/use_is_action_policies_license_valid', () => {
  const mocked = {
    useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
  };
  return { ...mocked, default: mocked };
});

const mockUseFetchActionPolicy = vi.fn();
vi.mock('../../hooks/use_fetch_action_policy', () => {
  const mocked = {
    useFetchActionPolicy: (...args: unknown[]) => mockUseFetchActionPolicy(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_fetch_rule_event_fields', () => {
  const mocked = {
    useFetchRuleEventFields: (_matcher?: string) => ({ data: undefined, isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_fetch_rules', () => {
  const mocked = {
    useFetchRules: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_fetch_rule_tags', () => {
  const mocked = {
    useFetchRuleTags: () => ({ data: [], isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_fetch_workflows', () => {
  const mocked = {
    useFetchWorkflows: () => ({
      data: {
        results: [
          { id: 'workflow-1', name: 'Workflow 1' },
          { id: 'workflow-2', name: 'Workflow 2' },
        ],
      },
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

const mockUseParams = vi.fn();
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: () => mockUseParams(),
  };
  return { ...mocked, default: mocked };
});

const TEST_SUBJ = {
  pageTitle: 'pageTitle',
  cancelButton: 'cancelButton',
  submitButton: 'submitButton',
  nameInput: 'nameInput',
  descriptionInput: 'descriptionInput',
  loadingSpinner: 'loadingSpinner',
  fetchErrorCallout: 'fetchErrorCallout',
} as const;

const EXISTING_POLICY: ActionPolicyResponse = {
  id: 'policy-1',
  version: 'WzEsMV0=',
  name: 'Critical production alerts',
  description: 'Routes critical alerts',
  enabled: true,
  matcher: { expression: 'data.severity : "critical"' },
  group_by: ['host.name', 'service.name'],
  grouping_mode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozed_until: null,
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  created_by: { profile_uid: 'elastic' },
  created_at: '2026-03-01T10:00:00.000Z',
  updated_by: { profile_uid: 'elastic' },
  updated_at: '2026-03-01T10:00:00.000Z',
};

const renderPage = () => {
  return render(
    <MockLocatorProvider locators={mockLocators}>
      <I18nProvider>
        <ActionPolicyFormPage />
      </I18nProvider>
    </MockLocatorProvider>
  );
};

const mockUseActionPolicyAutoAttach = vi.mocked(useActionPolicyAutoAttach);

describe('ActionPolicyFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLicenseValid = true;
    mockCreateMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
    mockCreateInlineWorkflows.mockResolvedValue([]);
    mockRollbackWorkflows.mockResolvedValue(undefined);
    mockUseFetchActionPolicy.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe('create mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({});
    });

    it('renders create title and save button', () => {
      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.pageTitle)).toHaveTextContent('Create action policy');
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Create policy');
      expect(screen.queryByTestId('actionPoliciesLicenseCallout')).toBeNull();
    });

    it('shows the license callout and keeps submit disabled when the license is not valid', async () => {
      mockIsLicenseValid = false;
      const user = userEvent.setup({ delay: null });
      renderPage();

      expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Policy from test');
      await user.tab();
      const destinationsCombo = screen.getByTestId('destinationsInput');
      await user.click(within(destinationsCombo).getByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Workflow 1' }));

      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toBeDisabled();
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('does not override the default, in-page, connector creation behavior', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));

      expect(await screen.findByTestId(/inlineWorkflowEditor-/)).not.toHaveAttribute(
        'data-connector-creation-mode'
      );
    });

    it('submits create payload on save', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Policy from test');
      await user.tab();
      await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'Description from test');
      await user.tab();

      // Select a workflow destination (required field)
      const destinationsCombo = screen.getByTestId('destinationsInput');
      const comboInput = within(destinationsCombo).getByRole('combobox');
      await user.click(comboInput);
      await user.click(await screen.findByRole('option', { name: 'Workflow 1' }));

      const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      await waitFor(() =>
        expect(mockCreateMutateAsync).toHaveBeenCalledWith({
          name: 'Policy from test',
          description: 'Description from test',
          grouping_mode: 'per_episode',
          throttle: { strategy: 'on_status_change', interval: null },
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
        })
      );
      expect(mockCreateInlineWorkflows).toHaveBeenCalledWith([]);
      await waitFor(() =>
        expect(mockLocators.actionPolicyLocators.navigateSync).toHaveBeenCalledWith({
          page: 'list',
        })
      );
    });

    it('creates inline workflows and merges them into destinations on submit', async () => {
      const user = userEvent.setup({ delay: null });
      mockCreateInlineWorkflows.mockResolvedValue(['wf-new']);
      renderPage();

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Inline policy');
      await user.tab();
      await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'desc');
      await user.tab();

      await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));
      await user.click(await screen.findByTestId(/inlineFill-/));

      const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      await waitFor(() => expect(mockCreateInlineWorkflows).toHaveBeenCalledTimes(1));
      expect(mockCreateInlineWorkflows).toHaveBeenCalledWith([
        expect.objectContaining({
          source: 'inline',
          stepType: 'slack',
          connectorId: 'connector-x',
        }),
      ]);
      await waitFor(() =>
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            destinations: [{ type: 'workflow', id: 'wf-new' }],
          })
        )
      );
    });

    it('rolls back created workflows when policy creation fails', async () => {
      const user = userEvent.setup({ delay: null });
      mockCreateInlineWorkflows.mockResolvedValue(['wf-new']);
      mockCreateMutateAsync.mockRejectedValue(new Error('policy failed'));
      renderPage();

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Inline policy');
      await user.tab();
      await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'desc');
      await user.tab();

      await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));
      await user.click(await screen.findByTestId(/inlineFill-/));

      const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      await waitFor(() => expect(mockRollbackWorkflows).toHaveBeenCalledWith(['wf-new']));
      expect(mockLocators.actionPolicyLocators.navigateSync).not.toHaveBeenCalled();
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockLocators.actionPolicyLocators.navigateSync).toHaveBeenCalledWith({ page: 'list' });
    });

    it('passes undefined to useActionPolicyAutoAttach in create mode', () => {
      renderPage();

      expect(mockUseActionPolicyAutoAttach).toHaveBeenCalledWith(undefined, expect.any(Object));
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'policy-1' });
    });

    it('renders edit title and update button when policy is loaded', () => {
      mockUseFetchActionPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.pageTitle)).toHaveTextContent('Edit action policy');
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Update policy');
    });

    it('shows loading state while fetching', () => {
      mockUseFetchActionPolicy.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.loadingSpinner)).toBeInTheDocument();
    });

    it('shows error callout when fetch fails', () => {
      mockUseFetchActionPolicy.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Not found'),
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.fetchErrorCallout)).toBeInTheDocument();
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });

    it('submits update payload on save', async () => {
      const user = userEvent.setup({ delay: null });
      mockUseFetchActionPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      const updateButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(updateButton).toBeEnabled());
      await user.click(updateButton);

      await waitFor(() => expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1));
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'policy-1',
        data: {
          version: 'WzEsMV0=',
          name: 'Critical production alerts',
          description: 'Routes critical alerts',
          grouping_mode: 'per_field',
          matcher: { expression: 'data.severity : "critical"' },
          group_by: ['host.name', 'service.name'],
          throttle: { strategy: 'time_interval', interval: '5m' },
          destinations: [{ type: 'workflow', id: 'workflow-2' }],
        },
      });
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup({ delay: null });
      mockUseFetchActionPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockLocators.actionPolicyLocators.navigateSync).toHaveBeenCalledWith({ page: 'list' });
    });

    describe('Agent Builder auto-attach', () => {
      it('passes the loaded action policy to useActionPolicyAutoAttach', () => {
        mockUseFetchActionPolicy.mockReturnValue({
          data: EXISTING_POLICY,
          isLoading: false,
          isError: false,
          error: null,
        });

        renderPage();

        expect(mockUseActionPolicyAutoAttach).toHaveBeenCalledWith(
          EXISTING_POLICY,
          expect.any(Object)
        );
      });
    });
  });
});
