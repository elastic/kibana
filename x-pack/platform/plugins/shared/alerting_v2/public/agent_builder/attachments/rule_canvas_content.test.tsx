/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RuleCanvasContent } from './rule_canvas_content';

const mockUpsertRule = jest.fn().mockResolvedValue({});
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
    return { upsertRule: mockUpsertRule };
  },
}));

jest.mock('../../components/rule_details/rule_context', () => ({
  RuleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../components/rule_details/rule_header_description', () => ({
  RuleHeaderDescription: () => <div data-test-subj="mockRuleHeaderDescription" />,
}));

jest.mock('../../components/rule_details/sidebar/rule_sidebar', () => ({
  RuleSidebar: () => <div data-test-subj="mockRuleSidebar" />,
}));

jest.mock('../../services/rules_api', () => ({
  RulesApi: Symbol('RulesApi'),
}));

const createAttachment = (
  overrides: { origin?: string; enabled?: boolean; dataId?: string } = {}
) => ({
  id: 'att-1',
  type: 'rule' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    kind: 'signal' as const,
    metadata: { name: 'My Rule', tags: ['tag1'], description: 'A test rule' },
    schedule: { every: '5m' },
    time_field: '@timestamp',
    query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
    state_transition: null,
    enabled: overrides.enabled,
    ...(overrides.dataId ? { id: overrides.dataId } : {}),
  } as any,
});

const renderCanvas = (
  overrides: { origin?: string; enabled?: boolean; dataId?: string } = {},
  callbackOverrides: Record<string, jest.Mock> = {}
) => {
  const attachment = createAttachment(overrides);
  const registerActionButtons = jest.fn();
  const updateOrigin = jest.fn().mockResolvedValue(undefined);
  const closeCanvas = jest.fn();

  const result = render(
    <RuleCanvasContent
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

describe('RuleCanvasContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the RuleSidebar', () => {
      const { getByTestId } = renderCanvas();
      expect(getByTestId('mockRuleSidebar')).toBeDefined();
    });

    it('renders the RuleHeaderDescription', () => {
      const { getByTestId } = renderCanvas();
      expect(getByTestId('mockRuleHeaderDescription')).toBeDefined();
    });
  });

  describe('action buttons for proposed (unsaved) rules', () => {
    it('registers Create rule button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create rule')).toBeDefined();
    });

    it('does not register Update Rule button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Rule')).toBeUndefined();
    });

    it('Create rule handler calls upsertRule and updateOrigin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = renderCanvas(
        { dataId: 'pre-assigned-id' },
        { updateOrigin }
      );

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create rule')!;
      await createButton.handler();

      expect(mockUpsertRule).toHaveBeenCalledWith(
        'pre-assigned-id',
        expect.objectContaining({ kind: 'signal' })
      );
      expect(updateOrigin).toHaveBeenCalledWith('pre-assigned-id');
      expect(mockAddSuccess).toHaveBeenCalled();
    });
  });

  describe('action buttons for persisted (saved) rules', () => {
    it('registers Update Rule button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Rule')).toBeDefined();
    });

    it('registers View in Rules button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'View in Rules')).toBeDefined();
    });

    it('does not register Create rule button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create rule')).toBeUndefined();
    });

    it('Update Rule handler calls upsertRule with the origin id', async () => {
      const { registerActionButtons, attachment } = renderCanvas({ origin: 'rule-123' });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Rule')!;
      await updateButton.handler();

      expect(mockUpsertRule).toHaveBeenCalledWith(
        'rule-123',
        expect.objectContaining({ metadata: attachment.data.metadata })
      );
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('View in Rules handler navigates to the rule detail page', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Rules')!;
      viewButton.handler();

      expect(mockNavigateToUrl).toHaveBeenCalledWith(expect.stringContaining('rule-123'));
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
