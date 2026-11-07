/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_INDICES_RULE_NAME,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostRule } from '../../../common/types';
import { DeleteRuleModal } from './delete_rule_modal';

const mockAddSuccess = jest.fn();
const mockServices = { notifications: { toasts: { addSuccess: mockAddSuccess } } };
jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => mockServices,
}));

const mockDeleteRule = jest.fn();
jest.mock('../../hooks/use_boost_state', () => ({
  useDeleteRule: () => ({ deleteRule: mockDeleteRule, isDeleting: false }),
}));

const mockNotifyError = jest.fn();
jest.mock('./rule_deletion_notice', () => ({
  notifyRuleDeletionError: (...args: unknown[]) => mockNotifyError(...args),
}));

const rule = (name: string, pattern: string, profileName: string, priority: number): BoostRule => ({
  name,
  index_patterns: [pattern],
  boost_profile: profileName,
  priority,
  is_builtin: false,
});

const rules = [
  rule('catalogs', 'catalog-*', BUILTIN_INDICES_PROFILE_NAMES.high_availability, 2),
  rule('fall', '*-fall', BUILTIN_INDICES_PROFILE_NAMES.on_demand, 1),
  rule('unused', 'nothing-*', BUILTIN_INDICES_PROFILE_NAMES.on_demand, 1),
  ...createDefaultRules(DEFAULT_RULE_PROFILES),
];

const renderModal = (ruleName: string) =>
  render(
    <IntlProvider locale="en">
      <DeleteRuleModal
        ruleName={ruleName}
        rules={rules}
        profiles={BUILTIN_PROFILES}
        dataSources={[
          { name: 'catalog-fall', type: 'index', size_in_bytes: 1e9 },
          { name: 'catalog-spring', type: 'index', size_in_bytes: 1e9, hidden: true },
        ]}
        onClose={jest.fn()}
      />
    </IntlProvider>
  );

describe('DeleteRuleModal', () => {
  it('lists what the rule applies to, with the rule and profile each falls back to', () => {
    renderModal('catalogs');

    expect(screen.getByTestId('deleteBoostRuleModal')).toHaveTextContent(
      'Deleting this rule will cause the 2 indices below to fall back to the next matching rule and its boost profile.'
    );
    expect(screen.getByTestId('deleteBoostRuleModal')).toHaveTextContent(
      "The boost profile this rule uses won't be deleted."
    );
    const [header, ...rows] = within(screen.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent('Affected indexNew ruleNew profile');
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent)
      )
    ).toEqual([
      ['catalog-fall', 'fall', BUILTIN_INDICES_PROFILE_NAMES.on_demand],
      // A hidden index falls back all the same, so it's listed, and marked.
      ['catalog-springHidden', DEFAULT_INDICES_RULE_NAME, DEFAULT_RULE_PROFILES.indices_profile],
    ]);
  });

  it("doesn't list anything for a rule that applies to nothing", () => {
    renderModal('unused');

    expect(screen.getByTestId('deleteBoostRuleModal')).toHaveTextContent(
      "This permanently deletes the rule. The boost profile it uses won't be deleted."
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a failed deletion, which can be tried again once the modal is gone', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    render(
      <IntlProvider locale="en">
        <DeleteRuleModal
          ruleName="unused"
          rules={rules}
          profiles={BUILTIN_PROFILES}
          dataSources={[]}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      </IntlProvider>
    );
    const error = new Error('Gateway Timeout');
    mockDeleteRule.mockRejectedValueOnce(error);

    await userEvent.click(screen.getByRole('button', { name: 'Delete rule' }));

    const [[services, name, reported, retry]] = mockNotifyError.mock.calls;
    expect([services, name, reported]).toEqual([mockServices, 'unused', error]);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    mockDeleteRule.mockResolvedValueOnce(undefined);
    await act(async () => retry());
    expect(mockAddSuccess).toHaveBeenCalledWith('Deleted boost rule "unused"');
    expect(onDeleted).toHaveBeenCalled();
  });
});
