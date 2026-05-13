/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ActionPolicyCanvasContent } from './action_policy_canvas_content';

const mockUpsertActionPolicy = jest.fn().mockResolvedValue({});
const mockNavigateToUrl = jest.fn();
const mockAddSuccess = jest.fn();
const mockPrepend = (path: string) => `/base${path}`;

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl };
    }
    if (token === 'http') {
      return { basePath: { prepend: mockPrepend } };
    }
    if (token === 'notifications') {
      return { toasts: { addSuccess: mockAddSuccess } };
    }
    return { upsertActionPolicy: mockUpsertActionPolicy };
  },
}));

jest.mock('../../components/action_policy/details_flyout/action_policy_definition_list', () => ({
  ActionPolicyDefinitionList: (props: Record<string, unknown>) => (
    <div data-test-subj="mockDefinitionList">{JSON.stringify(Object.keys(props))}</div>
  ),
}));

jest.mock('../../services/action_policies_api', () => ({
  ActionPoliciesApi: Symbol('ActionPoliciesApi'),
}));

const createAttachment = (
  overrides: { origin?: string; enabled?: boolean; dataId?: string; version?: string } = {}
) => ({
  id: 'att-1',
  type: 'action_policy' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    name: 'My Policy',
    description: 'A test policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
    matcher: 'rule.id: "abc"',
    groupingMode: 'per_episode' as const,
    throttle: { strategy: 'on_status_change' as const },
    tags: ['tag1'],
    enabled: overrides.enabled,
    ...(overrides.dataId ? { id: overrides.dataId } : {}),
    ...(overrides.version ? { version: overrides.version } : {}),
  } as any,
});

const renderCanvas = (
  overrides: { origin?: string; enabled?: boolean; dataId?: string; version?: string } = {},
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

  return {
    ...result,
    registerActionButtons: callbackOverrides.registerActionButtons ?? registerActionButtons,
    updateOrigin: callbackOverrides.updateOrigin ?? updateOrigin,
    attachment,
  };
};

const getLastRegisteredButtons = (registerActionButtons: jest.Mock) => {
  const { calls } = registerActionButtons.mock;
  return calls[calls.length - 1][0] as Array<{ label: string; handler: () => unknown }>;
};

describe('ActionPolicyCanvasContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the policy name', () => {
      const { getByText } = renderCanvas();
      expect(getByText('My Policy')).toBeDefined();
    });

    it('renders the ActionPolicyDefinitionList', () => {
      const { getByTestId } = renderCanvas();
      expect(getByTestId('mockDefinitionList')).toBeDefined();
    });
  });

  describe('action buttons for proposed (unsaved) policies', () => {
    it('registers Create policy button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create policy')).toBeDefined();
    });

    it('does not register Update Policy button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Policy')).toBeUndefined();
    });

    it('Create policy handler calls upsertActionPolicy and updateOrigin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = renderCanvas(
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
    it('registers Update Policy button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'policy-123', version: 'v1' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Policy')).toBeDefined();
    });

    it('registers View in Policies button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'policy-123', version: 'v1' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'View in Policies')).toBeDefined();
    });

    it('does not register Create policy button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'policy-123', version: 'v1' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create policy')).toBeUndefined();
    });

    it('Update Policy handler calls upsertActionPolicy with the origin id', async () => {
      const { registerActionButtons } = renderCanvas({
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

    it('View in Policies handler navigates to the policy edit page', () => {
      const { registerActionButtons } = renderCanvas({
        origin: 'policy-123',
        version: 'v1',
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Policies')!;
      viewButton.handler();

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        expect.stringContaining('policy-123')
      );
    });
  });

  describe('mounted guard', () => {
    it('first registers empty buttons then real buttons', () => {
      const { registerActionButtons } = renderCanvas();
      const { calls } = registerActionButtons.mock;
      expect(calls[0][0]).toEqual([]);
      expect(calls[calls.length - 1][0].length).toBeGreaterThan(0);
    });
  });
});
