/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../services/rules_api';
import { createMockLocators, MockLocatorProvider } from '../../test_utils/test_providers';
import type { RuleActionsMenuProps } from './rule_actions_menu';
import { RuleActionsMenu } from './rule_actions_menu';

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  version: 1,
  metadata: { name: 'My Rule' },
  artifacts: [],
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { base: 'FROM logs-* | LIMIT 1' },
  created_by: { profile_uid: 'elastic' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'elastic' },
  updated_at: '2026-03-01T12:00:00.000Z',
};

const renderMenu = (props: Partial<RuleActionsMenuProps> = {}) => {
  const allProps: RuleActionsMenuProps = {
    rule,
    canWrite: true,
    onEdit: jest.fn(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    ...props,
  };
  const view = render(
    <I18nProvider>
      <MockLocatorProvider locators={createMockLocators()}>
        <RuleActionsMenu {...allProps} />
      </MockLocatorProvider>
    </I18nProvider>
  );
  return { ...view, props: allProps };
};

// EUI sets pointer-events: none on the popover panel during its opening animation, which
// jsdom never finishes.
const user = userEvent.setup({ pointerEventsCheck: 0 });

describe('RuleActionsMenu', () => {
  it('opens a "Rule actions" menu from the row trigger', async () => {
    renderMenu();

    await user.click(screen.getByTestId('ruleActionsButton-rule-1'));

    expect(await screen.findByRole('dialog', { name: 'Rule actions' })).toBeInTheDocument();
    expect(screen.getByTestId('editRule-rule-1')).toBeInTheDocument();
    expect(screen.getByTestId('cloneRule-rule-1')).toBeInTheDocument();
    expect(screen.getByTestId('deleteRule-rule-1')).toBeInTheDocument();
  });

  it('closes the menu and runs the action when an item is clicked', async () => {
    const { container, props } = renderMenu();

    await user.click(screen.getByTestId('ruleActionsButton-rule-1'));
    await waitFor(() =>
      expect(container.querySelector('.euiPopover')).toHaveClass('euiPopover-isOpen')
    );

    await user.click(await screen.findByTestId('cloneRule-rule-1'));

    expect(props.onClone).toHaveBeenCalledWith(rule);
    // EUI keeps the panel mounted during its close animation in jsdom, so check the wrapper.
    await waitFor(() =>
      expect(container.querySelector('.euiPopover')).not.toHaveClass('euiPopover-isOpen')
    );
  });

  it('renders nothing when no action is available', () => {
    const { container } = renderMenu({ canWrite: false });

    expect(container).toBeEmptyDOMElement();
  });
});
