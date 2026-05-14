/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ActionPolicyCanvasContent } from './action_policy_canvas_content';

const flushPromises = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mockUpsertActionPolicy = jest.fn().mockResolvedValue({});
const mockGetWorkflow = jest.fn().mockResolvedValue({ id: 'wf-1', name: 'Test Workflow' });
const mockGetRule = jest.fn().mockResolvedValue({ id: 'abc', name: 'Test Rule' });
const mockNavigateToUrl = jest.fn();
const mockAddSuccess = jest.fn();
const mockPrepend = (path: string) => `/base${path}`;

jest.mock('../../services/action_policies_api', () => ({
  ActionPoliciesApi: 'ActionPoliciesApi',
}));

jest.mock('../../services/rules_api', () => ({
  RulesApi: 'RulesApi',
}));

jest.mock('../../services/workflows_api', () => ({
  WorkflowsApi: 'WorkflowsApi',
}));

const mockApplicationService = { navigateToUrl: (...a: unknown[]) => mockNavigateToUrl(...a) };
const mockHttpService = { basePath: { prepend: mockPrepend } };
const mockNotificationsService = {
  toasts: { addSuccess: (...a: unknown[]) => mockAddSuccess(...a) },
};
const mockWorkflowsApiService = { getWorkflow: (...a: unknown[]) => mockGetWorkflow(...a) };
const mockRulesApiService = { getRule: (...a: unknown[]) => mockGetRule(...a) };
const mockActionPoliciesApiService = {
  upsertActionPolicy: (...a: unknown[]) => mockUpsertActionPolicy(...a),
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      application: mockApplicationService,
      http: mockHttpService,
      notifications: mockNotificationsService,
      WorkflowsApi: mockWorkflowsApiService,
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

const createAttachment = (
  overrides: {
    origin?: string;
    enabled?: boolean;
    dataId?: string;
    version?: string;
    destinations?: Array<{ type: 'workflow'; id: string }>;
    matcher?: string | null;
  } = {}
) => ({
  id: 'att-1',
  type: 'action_policy' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    name: 'My Policy',
    type: 'global' as const,
    description: 'A test policy',
    destinations: overrides.destinations ?? [{ type: 'workflow' as const, id: 'wf-1' }],
    matcher: overrides.matcher !== undefined ? overrides.matcher : 'rule.id: "abc"',
    groupingMode: 'per_episode' as const,
    throttle: { strategy: 'on_status_change' as const },
    tags: ['tag1'],
    enabled: overrides.enabled,
    ...(overrides.dataId ? { id: overrides.dataId } : {}),
    ...(overrides.version ? { version: overrides.version } : {}),
  } as any,
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
        { dataId: 'pre-assigned-id' },
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
  });

  describe('action buttons for persisted (saved) policies', () => {
    it('registers Update Policy button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        version: 'v1',
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Policy')).toBeDefined();
    });

    it('registers View in Policies button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        version: 'v1',
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'View in Policies')).toBeDefined();
    });

    it('does not register Create policy button', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        version: 'v1',
      });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create policy')).toBeUndefined();
    });

    it('Update Policy handler calls upsertActionPolicy with the origin id', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        version: 'v1',
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

    it('View in Policies handler navigates to the policy edit page', async () => {
      const { registerActionButtons } = await renderCanvas({
        origin: 'policy-123',
        version: 'v1',
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Policies')!;
      viewButton.handler();

      expect(mockNavigateToUrl).toHaveBeenCalledWith(expect.stringContaining('policy-123'));
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

    it('disables the save button when the matched rule does not exist', async () => {
      mockGetWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Workflow' });
      mockGetRule.mockRejectedValue(new Error('Not found'));

      const { registerActionButtons } = await renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      expect(createButton.disabled).toBe(true);
      expect(createButton.disabledReason).toBeDefined();
    });

    it('enables the save button when there are no workflow destinations and no matcher rule', async () => {
      const { registerActionButtons } = await renderCanvas({ destinations: [], matcher: null });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create policy')!;
      expect(createButton.disabled).toBeFalsy();
    });

    it('checks each workflow destination via WorkflowsApi.getWorkflow', async () => {
      mockGetWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Workflow' });

      await renderCanvas({
        destinations: [
          { type: 'workflow', id: 'wf-1' },
          { type: 'workflow', id: 'wf-2' },
        ],
      });

      expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1', expect.any(AbortSignal));
      expect(mockGetWorkflow).toHaveBeenCalledWith('wf-2', expect.any(AbortSignal));
      expect(mockGetWorkflow).toHaveBeenCalledTimes(2);
    });

    it('checks the rule referenced in the matcher via RulesApi.getRule', async () => {
      await renderCanvas({ matcher: 'rule.id: "my-rule-id"' });

      expect(mockGetRule).toHaveBeenCalledWith('my-rule-id', expect.any(AbortSignal));
      expect(mockGetRule).toHaveBeenCalledTimes(1);
    });

    it('does not check a rule when the matcher has no rule.id clause', async () => {
      await renderCanvas({ matcher: 'rule.tags: "production"' });

      expect(mockGetRule).not.toHaveBeenCalled();
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
