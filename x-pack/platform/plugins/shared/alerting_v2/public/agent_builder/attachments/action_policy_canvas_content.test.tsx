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
import { ActionPolicyCanvasContent } from './action_policy_canvas_content';

const flushPromises = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mockUpsertActionPolicy = jest.fn().mockResolvedValue({});
const mockGetActionPolicy = jest.fn();
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
  getActionPolicy: (...a: unknown[]) => mockGetActionPolicy(...a),
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      notifications: mockNotificationsService,
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

jest.mock('../../components/action_policy/details_flyout/action_policy_definition_list', () => ({
  ActionPolicyDefinitionList: (props: Record<string, unknown>) => (
    <div data-test-subj="mockDefinitionList">{JSON.stringify(Object.keys(props))}</div>
  ),
}));

const defaultData = {
  name: 'My Policy',
  description: 'A test policy',
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  matcher: { tags: ['abc'] },
  groupingMode: 'per_alert' as const,
  throttle: { strategy: 'on_status_change' as const },
};

const createAttachment = ({
  id = 'att-1',
  origin,
  data,
  versionData,
}: {
  id?: string;
  origin?: string;
  data?: Record<string, unknown>;
  versionData?: {
    version: number;
    versionCount: number;
    createdAt: string;
    originSyncedAt?: string;
  };
} = {}) => ({
  id,
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin,
  versionData,
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
    mockUpsertActionPolicy.mockResolvedValue({});
    mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-04-10T00:00:00.000Z' });
  });

  describe('rendering', () => {
    it('renders the policy name', async () => {
      const { getByText } = await renderCanvas();
      expect(getByText('My Policy')).toBeDefined();
    });

    it('renders the ActionPolicyDefinitionList', async () => {
      const { getByTestId } = await renderCanvas();
      expect(getByTestId('mockDefinitionList')).toBeDefined();
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

    it('Update Policy handler calls upsertActionPolicy with data.id and syncs the attachment', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = await renderCanvas(
        { origin: 'policy-123', data: { id: 'policy-123' } },
        { updateOrigin }
      );

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Policy')!;
      await updateButton.handler();

      expect(mockUpsertActionPolicy).toHaveBeenCalledWith(
        'policy-123',
        expect.objectContaining({ name: 'My Policy' })
      );
      expect(updateOrigin).toHaveBeenCalledWith('policy-123');
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

  describe('sync indication', () => {
    const syncedVersionData = {
      version: 1,
      versionCount: 1,
      createdAt: '2026-04-01T00:00:00.000Z',
      originSyncedAt: '2026-04-01T00:00:00.000Z',
    };

    it('shows the draft status for an unsaved policy without a notice', async () => {
      const { getByTestId, queryByTestId } = await renderCanvas();

      expect(getByTestId('actionPolicyCanvasStatus')).toHaveTextContent('Draft');
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(mockGetActionPolicy).not.toHaveBeenCalled();
    });

    it('shows the enabled status and all changes saved for a policy that still matches the save', async () => {
      mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-04-01T00:00:00.000Z' });
      const { getByTestId, queryByTestId, registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123', enabled: true, updated_at: '2026-04-01T00:00:00.000Z' },
        versionData: syncedVersionData,
      });

      expect(mockGetActionPolicy).toHaveBeenCalledWith('policy-123', expect.any(AbortSignal));
      expect(getByTestId('actionPolicyCanvasStatus')).toHaveTextContent('Enabled');
      expect(queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(getByTestId('attachmentPersistenceSaved')).toHaveTextContent('All changes saved');

      const updateButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Policy'
      );
      expect(updateButton?.disabled).toBe(true);
      expect(updateButton?.disabledReason).toBe('All changes saved');
    });

    it('shows all changes saved and blocks a second update once Update Policy succeeds', async () => {
      const updateOrigin = jest.fn().mockResolvedValue({
        success: true,
        attachment: { origin_snapshot_at: '2026-04-03T00:00:00.000Z' },
      });
      const { getByTestId, queryByTestId, registerActionButtons } = await renderCanvas(
        {
          id: 'att-policy-update-then-saved',
          origin: 'policy-123',
          data: { id: 'policy-123' },
          versionData: {
            version: 2,
            versionCount: 2,
            createdAt: '2026-04-02T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        },
        { updateOrigin }
      );
      expect(getByTestId('attachmentPersistenceUnsavedChanges')).toBeDefined();

      const updateButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Policy'
      )!;
      expect(updateButton.disabled).toBe(false);
      await act(async () => {
        await updateButton.handler();
      });
      await flushPromises();

      expect(updateOrigin).toHaveBeenCalledWith('policy-123');
      expect(getByTestId('attachmentPersistenceSaved')).toHaveTextContent('All changes saved');
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      const updateAfterSave = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Policy'
      );
      expect(updateAfterSave?.disabled).toBe(true);
      expect(updateAfterSave?.disabledReason).toBe('All changes saved');
    });

    it('shows the disabled status for a saved policy that is turned off', async () => {
      const { getByTestId } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123', enabled: false },
      });

      expect(getByTestId('actionPolicyCanvasStatus')).toHaveTextContent('Disabled');
    });

    it('shows unsaved changes when this version is newer than the last sync', async () => {
      const { getByTestId } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123' },
        versionData: {
          version: 2,
          versionCount: 2,
          createdAt: '2026-04-02T00:00:00.000Z',
          originSyncedAt: '2026-04-01T00:00:00.000Z',
        },
      });

      expect(getByTestId('attachmentPersistenceUnsavedChanges')).toHaveTextContent(
        'Save the policy to keep these edits.'
      );
    });

    it('shows that the attachment is not in sync and blocks update', async () => {
      mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
      const { getByTestId, registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123', updated_at: '2026-04-01T00:00:00.000Z' },
        versionData: syncedVersionData,
      });

      expect(getByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent('Not in sync');
      const updateButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Policy'
      )!;
      expect(updateButton.disabled).toBe(true);
      expect(updateButton.disabledReason).toContain('The saved policy has changed');
    });

    it('does not flag drift when the saved policy matches this attachment snapshot', async () => {
      mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
      const { queryByTestId, registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        data: { id: 'policy-123', updated_at: '2026-05-01T00:00:00.000Z' },
        versionData: {
          version: 2,
          versionCount: 2,
          createdAt: '2026-04-02T00:00:00.000Z',
          originSyncedAt: '2026-04-01T00:00:00.000Z',
        },
      });

      expect(queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      const updateButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Policy'
      )!;
      expect(updateButton.disabled).toBe(false);
    });

    it('shows Saving... and disables create while the request is in flight', async () => {
      let finishSave: (policy: Record<string, never>) => void = () => {};
      mockUpsertActionPolicy.mockImplementation(
        () =>
          new Promise((resolve) => {
            finishSave = resolve;
          })
      );
      const { registerActionButtons, queryByTestId } = await renderCanvas({
        data: { id: 'pre-assigned-id' },
      });
      const createButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Create policy'
      )!;
      const pending = createButton.handler();
      await flushPromises();

      expect(queryByTestId('attachmentPersistenceSaving')).not.toBeNull();
      const saving = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Saving...'
      );
      expect(saving?.disabled).toBe(true);

      finishSave({});
      await pending;
      await flushPromises();

      expect(queryByTestId('attachmentPersistenceSaving')).toBeNull();
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
      expect(mockGetWorkflow).toHaveBeenCalledTimes(2);
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
