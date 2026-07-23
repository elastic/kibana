/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionPolicyFormPage } from './action_policy_form_page';

const mockNavigateToUrl = jest.fn();
const mockBasePath = { prepend: jest.fn((path: string) => `/mock${path}`) };

jest.mock('../../components/action_policy/form/components/matcher_input', () => ({
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
}));

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn((token: unknown) => {
    const tokenStr = String(token);
    if (tokenStr.includes('application')) {
      return {
        navigateToUrl: mockNavigateToUrl,
        getUrlForApp: jest.fn(
          (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path ? `/${options.path}` : ''}`
        ),
      };
    }
    if (tokenStr.includes('chrome')) {
      return { docTitle: { change: jest.fn() } };
    }
    if (tokenStr.includes('http')) {
      return { basePath: mockBasePath };
    }
    if (tokenStr.includes('uiSettings')) {
      return { get: () => true };
    }
    if (tokenStr.includes('notifications')) {
      return { toasts: { addError: jest.fn(), addSuccess: jest.fn() } };
    }
    return {};
  }),
  CoreStart: jest.fn((name: string) => `CoreStart(${name})`),
}));

const INLINE_DEFS = [
  {
    id: 'email',
    label: 'Email',
    iconType: 'email',
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

jest.mock('@kbn/alerting-v2-rule-form', () => ({
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
  }: {
    value: { id: string; connectorId: string | null; params: string };
    onChange: (next: { id: string; connectorId: string | null; params: string }) => void;
  }) => (
    <div data-test-subj={`inlineWorkflowEditor-${value.id}`}>
      <button
        type="button"
        data-test-subj={`inlineFill-${value.id}`}
        onClick={() => onChange({ ...value, connectorId: 'connector-x', params: 'message: hi' })}
      >
        fill
      </button>
    </div>
  ),
}));

const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockCreateInlineWorkflows = jest.fn();
const mockRollbackWorkflows = jest.fn();

jest.mock('../../hooks/use_create_action_policy', () => ({
  useCreateActionPolicy: () => ({
    mutateAsync: mockCreateMutateAsync,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_update_action_policy', () => ({
  useUpdateActionPolicy: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_create_inline_workflows', () => ({
  useCreateInlineWorkflows: () => ({
    createInlineWorkflows: mockCreateInlineWorkflows,
    rollbackWorkflows: mockRollbackWorkflows,
  }),
}));

const mockUseFetchActionPolicy = jest.fn();
jest.mock('../../hooks/use_fetch_action_policy', () => ({
  useFetchActionPolicy: (...args: unknown[]) => mockUseFetchActionPolicy(...args),
}));

jest.mock('../../hooks/use_fetch_data_fields', () => ({
  useFetchDataFields: (_matcher?: string) => ({ data: undefined, isLoading: false }),
}));

jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));

jest.mock('../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../hooks/use_fetch_tags', () => ({
  useFetchTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      results: [
        { id: 'workflow-1', name: 'Workflow 1' },
        { id: 'workflow-2', name: 'Workflow 2' },
      ],
    },
    isLoading: false,
  }),
}));

const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

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
  matcher: 'data.severity : "critical"',
  groupBy: ['host.name', 'service.name'],
  tags: ['production'],
  groupingMode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozedUntil: null,
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  createdBy: 'elastic',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-03-01T10:00:00.000Z',
  auth: {
    owner: 'elastic',
    createdByUser: false,
  },
};

const renderPage = () => {
  return render(
    <I18nProvider>
      <ActionPolicyFormPage />
    </I18nProvider>
  );
};

describe('ActionPolicyFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    });

    it('submits create payload on save', async () => {
      const user = userEvent.setup();
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
          groupingMode: 'per_episode',
          throttle: { strategy: 'on_status_change', interval: null },
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
        })
      );
      expect(mockCreateInlineWorkflows).toHaveBeenCalledWith([]);
      await waitFor(() =>
        expect(mockNavigateToUrl).toHaveBeenCalledWith(expect.stringContaining('/action_policies'))
      );
    });

    it('creates inline workflows and merges them into destinations on submit', async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      expect(mockNavigateToUrl).not.toHaveBeenCalledWith(
        expect.stringContaining('/action_policies')
      );
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(expect.stringContaining('/action_policies'));
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
      const user = userEvent.setup();
      mockUseFetchActionPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
      await user.tab();
      await user.click(screen.getByTestId(TEST_SUBJ.descriptionInput));
      await user.tab();

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
          groupingMode: 'per_field',
          tags: ['production'],
          matcher: 'data.severity : "critical"',
          groupBy: ['host.name', 'service.name'],
          throttle: { strategy: 'time_interval', interval: '5m' },
          destinations: [{ type: 'workflow', id: 'workflow-2' }],
        },
      });
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup();
      mockUseFetchActionPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(expect.stringContaining('/action_policies'));
    });
  });
});
