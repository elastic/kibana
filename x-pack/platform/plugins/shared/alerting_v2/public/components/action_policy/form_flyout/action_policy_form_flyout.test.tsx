/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionPolicyFormFlyout } from './action_policy_form_flyout';

const mockGetUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
);
let mockIsLicenseValid = true;

jest.mock('../../../hooks/use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return {
        capabilities: {},
        getUrlForApp: mockGetUrlForApp,
      };
    }
    if (token === 'uiSettings') {
      return { get: () => true };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

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

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  INLINE_ACTION_STEP_DEFINITIONS: INLINE_DEFS,
  getInlineActionStepDefinition: (id: string) => INLINE_DEFS.find((d) => d.id === id),
  isActionValid: () => true,
  InlineWorkflowEditor: ({
    value,
    connectorCreationConfig,
  }: {
    value: { id: string };
    connectorCreationConfig?: { mode: string; href?: string };
  }) => (
    <div
      data-test-subj={`inlineWorkflowEditor-${value.id}`}
      data-connector-creation-mode={connectorCreationConfig?.mode}
      data-connector-creation-href={connectorCreationConfig?.href}
    />
  ),
}));

jest.mock('../form/components/matcher_input', () => ({
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

jest.mock('../../../hooks/use_fetch_rule_event_fields', () => ({
  useFetchRuleEventFields: (_matcher?: string) => ({ data: undefined, isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_rules', () => ({
  useFetchRules: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_rule_routing_tags', () => ({
  useFetchRuleRoutingTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      results: [
        {
          id: 'wf-1',
          name: 'Test Workflow',
          description: '',
          enabled: true,
          definition: null,
          createdAt: '',
          history: [],
          valid: true,
        },
      ],
      total: 1,
      page: 1,
      size: 100,
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

const TEST_SUBJ = {
  title: 'title',
  cancelButton: 'cancelButton',
  submitButton: 'submitButton',
  nameInput: 'nameInput',
  descriptionInput: 'descriptionInput',
} as const;

const renderFlyout = ({
  onClose = jest.fn(),
  onSave,
  onUpdate,
  initialValues,
  isLoading = false,
}: {
  onClose?: jest.Mock;
  onSave?: jest.Mock;
  onUpdate?: jest.Mock;
  initialValues?: ActionPolicyResponse;
  isLoading?: boolean;
}) => {
  return render(
    <I18nProvider>
      <ActionPolicyFormFlyout
        onClose={onClose}
        onSave={onSave}
        onUpdate={onUpdate}
        initialValues={initialValues}
        isLoading={isLoading}
      />
    </I18nProvider>
  );
};

describe('ActionPolicyFormFlyout', () => {
  beforeEach(() => {
    mockIsLicenseValid = true;
  });

  it('renders create mode and closes on cancel', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();

    renderFlyout({ onClose, onSave: jest.fn() });

    expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Create action policy');
    expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Create policy');

    await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks closing while saving', () => {
    const onClose = jest.fn();

    renderFlyout({ onClose, onSave: jest.fn(), isLoading: true });

    expect(screen.queryByTestId('euiFlyoutCloseButton')).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.cancelButton)).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the license warning and disables submission when the license is invalid', () => {
    mockIsLicenseValid = false;

    renderFlyout({ onClose: jest.fn(), onSave: jest.fn() });

    expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.submitButton)).toBeDisabled();
  });

  it('keeps submit enabled and reveals the errors instead of saving an incomplete form', async () => {
    const onSave = jest.fn();
    renderFlyout({ onClose: jest.fn(), onSave });

    const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('At least one destination is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('renders the inline simple workflow builder alongside the existing-workflow selector', () => {
    renderFlyout({ onClose: jest.fn(), onSave: jest.fn() });

    expect(screen.getByTestId('simpleWorkflowBuilder')).toBeInTheDocument();
    expect(screen.getByTestId('destinationsInput')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('actionPolicyFormSection-notificationControls'))
        .getByText('Notification controls')
        .closest('button')
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens connector creation in a new tab for inline workflows', async () => {
    const user = userEvent.setup();
    renderFlyout({ onClose: jest.fn(), onSave: jest.fn() });

    await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));

    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-connector-creation-mode',
      'new-tab'
    );
    expect(screen.getByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-connector-creation-href',
      '/app/management/connectors'
    );
    expect(mockGetUrlForApp).toHaveBeenCalledWith('management', {
      deepLinkId: 'triggersActionsConnectors',
      path: '/connectors',
    });
  });

  it('forwards the raw form state (not a payload) to onSave so the host can build it', async () => {
    const onSave = jest.fn();

    renderFlyout({ onClose: jest.fn(), onSave });

    fireEvent.change(screen.getByTestId(TEST_SUBJ.nameInput), {
      target: { value: 'Policy from test' },
    });
    fireEvent.change(screen.getByTestId(TEST_SUBJ.descriptionInput), {
      target: { value: 'Description from test' },
    });

    // Select a workflow destination (required field)
    const destinationsCombo = screen.getByTestId('destinationsInput');
    fireEvent.click(within(destinationsCombo).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Test Workflow' }));

    const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      name: 'Policy from test',
      description: 'Description from test',
      matcher: null,
      groupingMode: 'per_alert',
      groupBy: [],
      throttleStrategy: 'on_status_change',
      throttleInterval: '',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      inlineActions: [],
    });
  });

  it('forwards inline "simple workflow" drafts to onSave instead of dropping them', async () => {
    const onSave = jest.fn();

    renderFlyout({ onClose: jest.fn(), onSave });

    fireEvent.change(screen.getByTestId(TEST_SUBJ.nameInput), {
      target: { value: 'Inline policy' },
    });

    // Add an inline Slack workflow draft (no existing destination selected).
    fireEvent.click(screen.getByTestId('simpleWorkflowAdd-slack'));

    const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: [],
        inlineActions: [expect.objectContaining({ source: 'inline', stepType: 'slack' })],
      })
    );
  });

  it('renders edit mode and submits update payload with optional fields', async () => {
    const user = userEvent.setup({ delay: null });
    const onUpdate = jest.fn();
    const initialValues: ActionPolicyResponse = {
      id: 'policy-1',
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

    renderFlyout({ onClose: jest.fn(), onUpdate, initialValues });

    expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Edit action policy');
    expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Update policy');

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    await user.click(screen.getByTestId(TEST_SUBJ.descriptionInput));
    await user.tab();

    const updateButton = screen.getByTestId(TEST_SUBJ.submitButton);
    await waitFor(() => expect(updateButton).toBeEnabled());
    await user.click(updateButton);

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate).toHaveBeenCalledWith('policy-1', {
      name: 'Critical production alerts',
      description: 'Routes critical alerts',
      matcher: { expression: 'data.severity : "critical"' },
      groupingMode: 'per_field',
      groupBy: ['host.name', 'service.name'],
      throttleStrategy: 'time_interval',
      throttleInterval: '5m',
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
      inlineActions: [],
    });
  });
});
