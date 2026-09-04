/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPolicyActionsMenu } from './action_policy_actions_menu';

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  version: 'v1',
  name: 'Test policy',
  description: '',
  enabled: true,
  destinations: [],
  matcher: null,
  group_by: null,
  tags: null,
  grouping_mode: null,
  throttle: null,
  snoozed_until: null,
  auth: { owner: 'elastic', created_by_user: true },
  created_by: 'elastic',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'elastic',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const renderMenu = (props: Partial<React.ComponentProps<typeof ActionPolicyActionsMenu>> = {}) => {
  const defaults = {
    policy: createPolicy(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    onUpdateApiKey: jest.fn(),
  };
  render(
    <I18nProvider>
      <ActionPolicyActionsMenu {...defaults} {...props} />
    </I18nProvider>
  );
  return { ...defaults, ...props };
};

const openMenu = () => fireEvent.click(screen.getByLabelText('More actions'));

describe('ActionPolicyActionsMenu', () => {
  describe('default kebab trigger', () => {
    it('renders the "More actions" icon button when renderButton is not provided', () => {
      renderMenu();
      expect(screen.getByLabelText('More actions')).toBeInTheDocument();
    });

    it('replaces the kebab trigger with the element returned by renderButton', () => {
      renderMenu({
        renderButton: ({ toggle }) => (
          <button data-test-subj="custom-trigger" onClick={toggle}>
            Take action
          </button>
        ),
      });
      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
      expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
    });
  });

  describe('item data-test-subj', () => {
    it('renders items with policy-scoped test subjects', () => {
      renderMenu({ onEdit: jest.fn(), onEnable: jest.fn(), onDisable: jest.fn() });
      openMenu();
      expect(screen.getByTestId('editActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.getByTestId('cloneActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.getByTestId('toggleEnabledActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.getByTestId('updateApiKeyActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.getByTestId('deleteActionPolicy-policy-1')).toBeInTheDocument();
    });
  });

  describe('snooze item', () => {
    it('does not render the snooze item when onSnooze/onCancelSnooze are omitted', () => {
      renderMenu();
      openMenu();
      expect(screen.queryByTestId('snoozeActionPolicy-policy-1')).not.toBeInTheDocument();
    });

    it('does not render the snooze item when the policy is disabled', () => {
      renderMenu({
        policy: createPolicy({ enabled: false }),
        onSnooze: jest.fn(),
        onCancelSnooze: jest.fn(),
      });
      openMenu();
      expect(screen.queryByTestId('snoozeActionPolicy-policy-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unsnoozeActionPolicy-policy-1')).not.toBeInTheDocument();
    });

    it('shows "Snooze" item on an active non-snoozed policy', () => {
      renderMenu({
        onSnooze: jest.fn(),
        onCancelSnooze: jest.fn(),
      });
      openMenu();
      expect(screen.getByTestId('snoozeActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.queryByTestId('unsnoozeActionPolicy-policy-1')).not.toBeInTheDocument();
    });

    it('shows "Unsnooze" item on an active snoozed policy', () => {
      const futureIso = new Date(Date.now() + 3_600_000).toISOString();
      renderMenu({
        policy: createPolicy({ snoozed_until: futureIso }),
        onSnooze: jest.fn(),
        onCancelSnooze: jest.fn(),
      });
      openMenu();
      expect(screen.getByTestId('unsnoozeActionPolicy-policy-1')).toBeInTheDocument();
      expect(screen.queryByTestId('snoozeActionPolicy-policy-1')).not.toBeInTheDocument();
    });

    it('calls onCancelSnooze when Unsnooze is clicked', async () => {
      const futureIso = new Date(Date.now() + 3_600_000).toISOString();
      const onCancelSnooze = jest.fn();
      renderMenu({
        policy: createPolicy({ snoozed_until: futureIso }),
        onSnooze: jest.fn(),
        onCancelSnooze,
      });
      openMenu();
      fireEvent.click(screen.getByTestId('unsnoozeActionPolicy-policy-1'));
      expect(onCancelSnooze).toHaveBeenCalledWith('policy-1');
    });

    it('opens the snooze modal when Snooze is clicked', async () => {
      renderMenu({
        onSnooze: jest.fn(),
        onCancelSnooze: jest.fn(),
      });
      openMenu();
      fireEvent.click(screen.getByTestId('snoozeActionPolicy-policy-1'));
      expect(screen.getByTestId('actionPolicySnoozeModal')).toBeInTheDocument();
    });

    it('calls onSnooze when the snooze modal is applied', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const onSnooze = jest.fn();
      renderMenu({ onSnooze, onCancelSnooze: jest.fn() });
      openMenu();
      fireEvent.click(screen.getByTestId('snoozeActionPolicy-policy-1'));
      await user.click(screen.getByTestId('actionPolicySnoozeModalApply'));
      expect(onSnooze).toHaveBeenCalledTimes(1);
      expect(onSnooze.mock.calls[0][0]).toBe('policy-1');
    });
  });
});
