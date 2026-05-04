/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RuleCanvasContent } from './rule_canvas_content';

jest.mock('@kbn/core-di-browser', () => ({
  Context: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  useService: () => ({}),
  CoreStart: (key: string) => key,
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

const createMockServices = () => ({
  rulesApi: {
    createRule: jest.fn().mockResolvedValue({ id: 'new-rule-id' }),
    updateRule: jest.fn().mockResolvedValue({}),
  } as any,
  application: {
    navigateToUrl: jest.fn(),
  } as any,
  basePath: {
    prepend: (path: string) => `/base${path}`,
  } as any,
  notifications: {
    toasts: { addSuccess: jest.fn(), addError: jest.fn() },
  } as any,
  container: {} as any,
});

const createAttachment = (overrides: { origin?: string; enabled?: boolean } = {}) => ({
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
    evaluation: { query: { kql: 'host.name: *' } },
    state_transition: null,
    enabled: overrides.enabled,
  } as any,
});

const renderCanvas = (
  overrides: { origin?: string; enabled?: boolean } = {},
  callbackOverrides: Record<string, jest.Mock> = {}
) => {
  const services = createMockServices();
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
      {...services}
    />
  );

  return {
    ...result,
    services,
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

    it('Create rule handler calls createRule and updateOrigin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { services, registerActionButtons } = renderCanvas({}, { updateOrigin });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create rule')!;
      await createButton.handler();

      expect(services.rulesApi.createRule).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'signal' })
      );
      expect(updateOrigin).toHaveBeenCalledWith('new-rule-id');
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
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

    it('Update Rule handler calls updateRule with the rule id', async () => {
      const { services, registerActionButtons, attachment } = renderCanvas({
        origin: 'rule-123',
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Rule')!;
      await updateButton.handler();

      expect(services.rulesApi.updateRule).toHaveBeenCalledWith(
        'rule-123',
        expect.objectContaining({ metadata: attachment.data.metadata })
      );
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
    });

    it('View in Rules handler navigates to the rule detail page', () => {
      const { services, registerActionButtons } = renderCanvas({ origin: 'rule-123' });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Rules')!;
      viewButton.handler();

      expect(services.application.navigateToUrl).toHaveBeenCalledWith(
        expect.stringContaining('rule-123')
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
