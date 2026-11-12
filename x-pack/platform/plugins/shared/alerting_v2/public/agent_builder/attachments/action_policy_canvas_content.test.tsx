/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ACTION_POLICY_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import { getFrequencyLabel, getGroupingModeLabel } from '../../components/action_policy/labels';
import { ActionPolicyCanvasContent } from './action_policy_canvas_content';

const flushPromises = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mockUpsertActionPolicy = jest.fn().mockResolvedValue({});
const mockGetWorkflow = jest.fn().mockResolvedValue({ id: 'wf-1', name: 'Test Workflow' });
const mockGetRule = jest.fn().mockResolvedValue({ id: 'abc', name: 'Test Rule' });
const mockActionPolicyNavigateSync = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('../../services/action_policies_api', () => ({
  ActionPoliciesApi: 'ActionPoliciesApi',
}));

jest.mock('../../services/rules_api', () => ({
  RulesApi: 'RulesApi',
}));

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: 'WorkflowApi',
}));

jest.mock('../../application/bind_locators_to_host', () => ({
  getAlertingV2Locators: () => ({
    actionPolicyLocators: {
      navigateSync: (...args: unknown[]) => mockActionPolicyNavigateSync(...args),
    },
  }),
}));

const mockNotificationsService = {
  toasts: {
    addSuccess: (...a: unknown[]) => mockAddSuccess(...a),
    addDanger: (...a: unknown[]) => mockAddDanger(...a),
  },
};
const mockWorkflowApiService = { getWorkflow: (...a: unknown[]) => mockGetWorkflow(...a) };
const mockRulesApiService = { getRule: (...a: unknown[]) => mockGetRule(...a) };
const mockActionPoliciesApiService = {
  upsertActionPolicy: (...a: unknown[]) => mockUpsertActionPolicy(...a),
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      notifications: mockNotificationsService,
      application: { getUrlForApp: (appId: string) => `/app/${appId}` },
      uiSettings: {
        get: () => false,
      },
      WorkflowApi: mockWorkflowApiService,
      RulesApi: mockRulesApiService,
      ActionPoliciesApi: mockActionPoliciesApiService,
    };
    return services[token as string] ?? {};
  },
}));

const defaultData = {
  name: 'My Policy',
  description: 'A test policy',
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  matcher: { tags: ['abc'] },
  grouping: { mode: 'per_alert' as const },
  throttle: { strategy: 'on_status_change' as const },
};

const createAttachment = ({
  origin,
  data,
}: { origin?: string; data?: Record<string, unknown> } = {}) => ({
  id: 'att-1',
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin,
  data: { ...defaultData, ...data } as any,
});

const renderCanvas = async (
  overrides: Parameters<typeof createAttachment>[0] = {},
  callbackOverrides: Record<string, jest.Mock> = {}
) => {
  const attachment = createAttachment(overrides);
  const registerActionButtons = jest.fn();
  const updateOrigin = jest.fn().mockResolvedValue(undefined);
  const closeCanvas = jest.fn();

  const result = render(
    <ActionPolicyCanvasContent
      attachment={attachment}
      isSidebar={false}
      registerActionButtons={callbackOverrides.registerActionButtons ?? registerActionButtons}
      updateOrigin={callbackOverrides.updateOrigin ?? updateOrigin}
      closeCanvas={closeCanvas}
    />
  );

  await flushPromises();

  return {
    ...result,
    registerActionButtons: callbackOverrides.registerActionButtons ?? registerActionButtons,
    updateOrigin: callbackOverrides.updateOrigin ?? updateOrigin,
    attachment,
  };
};

const getLastRegisteredButtons = (
  registerActionButtons: jest.Mock
): Array<{
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  handler: () => unknown;
}> => {
  const { calls } = registerActionButtons.mock;
  return calls[calls.length - 1][0];
};

describe('ActionPolicyCanvasContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Test Workflow' });
    mockGetRule.mockResolvedValue({ id: 'abc', name: 'Test Rule' });
  });

  describe('rendering', () => {
    it('renders the Definition, Notification and Destinations sections of the shared summary', async () => {
      const { getByTestId } = await renderCanvas();
      expect(getByTestId('actionPolicyDetailsFlyoutDefinition')).toBeDefined();
      expect(getByTestId('actionPolicyDetailsFlyoutNotification')).toBeDefined();
      expect(getByTestId('actionPolicyDetailsFlyoutDestinations')).toBeDefined();
    });

    it('maps the attachment grouping and throttle to the Notification section', async () => {
      const { getByTestId } = await renderCanvas();
      expect(getByTestId('actionPolicyDetailsFlyoutDispatchModeBlock').textContent).toContain(
        getGroupingModeLabel('per_alert')
      );
      expect(getByTestId('actionPolicyDetailsFlyoutFrequencyBlock').textContent).toContain(
        getFrequencyLabel({ strategy: 'on_status_change' }, 'per_alert')
      );
    });

    it('renders the policy description', async () => {
      const { getByText } = await renderCanvas();
      expect(getByText('A test policy')).toBeDefined();
    });

    it('does not render the "See all affected rules" link', async () => {
      const { queryByTestId } = await renderCanvas();
      expect(queryByTestId('actionPolicyDetailsFlyoutSeeAffectedRulesLink')).toBeNull();
    });
  });

  describe('action buttons for proposed (unsaved) policies', () => {
    it('registers Create policy button', async () => {
      const { registerActionButtons } = await renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create policy')).toBeDefined();
    });

    it('does not register Update Policy button', async () => {
      const { registerActionButtons } = await renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Policy')).toBeUndefined();
    });

    it('Create policy handler calls upsertActionPolicy and updateOrigin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = await renderCanvas(
        { data: { id: 'pre-assigned-id' } },
        { updateOrigin }
      );

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      await createButton.handler();

      expect(mockUpsertActionPolicy).toHaveBeenCalledWith(
        'pre-assigned-id',
        expect.objectContaining({ name: 'My Policy' })
      );
      expect(updateOrigin).toHaveBeenCalledWith('pre-assigned-id');
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('shows a danger toast when create fails', async () => {
      mockUpsertActionPolicy.mockRejectedValueOnce({ message: 'Server error' });

      const { registerActionButtons } = await renderCanvas({ data: { id: 'pre-assigned-id' } });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      await createButton.handler();

      expect(mockAddDanger).toHaveBeenCalledWith(expect.stringContaining('Failed to create'));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  describe('action buttons for persisted (saved) policies', () => {
    it('registers Update Policy button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Policy')).toBeDefined();
    });

    it('registers View in Policies button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'View in Policies')).toBeDefined();
    });

    it('does not register Create policy button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create policy')).toBeUndefined();
    });

    it('Update Policy handler calls upsertActionPolicy with data.id', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Policy')!;
      await updateButton.handler();

      expect(mockUpsertActionPolicy).toHaveBeenCalledWith(
        'policy-123',
        expect.objectContaining({ name: 'My Policy' })
      );
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('shows a danger toast when update fails', async () => {
      mockUpsertActionPolicy.mockRejectedValueOnce({ message: 'Conflict' });

      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Policy')!;
      await updateButton.handler();

      expect(mockAddDanger).toHaveBeenCalledWith(expect.stringContaining('Failed to update'));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    it('View in Policies handler navigates with the observability host', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Policies')!;
      viewButton.handler();

      expect(mockActionPolicyNavigateSync).toHaveBeenCalledWith({
        page: 'edit',
        actionPolicyId: 'policy-123',
        host: OBSERVABILITY_ALERTING_HOST.actionPolicies,
      });
    });
  });

  describe('dependency readiness', () => {
    it('enables the save button when all dependencies are persisted', async () => {
      mockGetWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Persisted Workflow' });
      mockGetRule.mockResolvedValue({ id: 'abc', name: 'Persisted Rule' });

      const { registerActionButtons } = await renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      expect(createButton.disabled).toBeFalsy();
    });

    it('disables the save button when a workflow destination does not exist', async () => {
      mockGetWorkflow.mockRejectedValue(new Error('Not found'));

      const { registerActionButtons } = await renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      expect(createButton.disabled).toBe(true);
      expect(createButton.disabledReason).toBeDefined();
    });

    it('enables the save button when there are no workflow destinations and no matcher rule', async () => {
      const { registerActionButtons } = await renderCanvas({
        data: { destinations: [], matcher: null },
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      expect(createButton.disabled).toBeFalsy();
    });

    it('checks each workflow destination via WorkflowApi.getWorkflow', async () => {
      mockGetWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Workflow' });

      await renderCanvas({
        data: {
          destinations: [
            { type: 'workflow', id: 'wf-1' },
            { type: 'workflow', id: 'wf-2' },
          ],
        },
      });

      expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1');
      expect(mockGetWorkflow).toHaveBeenCalledWith('wf-2');
      // The destination cards in the summary also fetch each workflow to show its name.
      const requestedIds = new Set(mockGetWorkflow.mock.calls.map(([id]) => id));
      expect(requestedIds).toEqual(new Set(['wf-1', 'wf-2']));
    });
  });

  describe('mounted guard', () => {
    it('first registers empty buttons then real buttons', async () => {
      const { registerActionButtons } = await renderCanvas();
      const { calls } = registerActionButtons.mock;
      expect(calls[0][0]).toEqual([]);
      expect(calls[calls.length - 1][0].length).toBeGreaterThan(0);
    });
  });
});
