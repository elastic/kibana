/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from '../../../common/presets';
import type { BoostProfile, BoostRule, BoostState } from '../../../common/types';
import { RuleFlyout } from './rule_flyout';

const customProfile = (name: string): BoostProfile => ({
  name,
  type: 'indices',
  is_builtin: false,
  min_boost: 1,
  max_boost: 4,
  high_availability: 'none',
  prewarm: false,
  pinned: false,
});

const rule: BoostRule = {
  name: 'catalogs',
  index_patterns: ['catalog-*'],
  boost_profile: 'zeta-search',
  priority: 1,
  is_builtin: false,
};

const state: BoostState = {
  settings: {
    mode: 'advanced',
    simple: DEFAULT_SIMPLE_MODE_DEFAULTS,
    custom_defaults: NO_CUSTOM_DEFAULTS,
  },
  profiles: [...BUILTIN_PROFILES, customProfile('zeta-search'), customProfile('alpha-search')],
  rules: [...createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS)), rule],
  data_sources: [{ name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 }],
};

const mutation = { mutate: jest.fn(), isLoading: false };
const createProfile = {
  mutate: jest.fn((_profile, { onSuccess }: { onSuccess: () => void }) => onSuccess()),
  isLoading: false,
};

jest.mock('../../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: state }),
  useCreateRule: () => mutation,
  useUpdateRule: () => mutation,
  useUpdateDefaultRule: () => mutation,
  useCreateProfile: () => createProfile,
  useUpdateProfile: () => mutation,
}));

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

const renderFlyout = (flyoutRule = rule) => {
  render(
    <IntlProvider locale="en">
      <RuleFlyout rule={flyoutRule} onClose={jest.fn()} />
    </IntlProvider>
  );
  const getInput = (): HTMLInputElement =>
    within(screen.getByTestId('boostRuleProfile')).getByTestId('comboBoxSearchInput');
  // Clicking another field blurs the picker. Tab stays in the picker while it highlights an option.
  const blur = () => userEvent.click(screen.getByTestId('boostRulePriority'));
  return { getInput, blur };
};

describe('RuleFlyout profile picker', () => {
  it('lists profiles alphabetically within each type, whether or not they are managed', async () => {
    const { getInput } = renderFlyout();

    await userEvent.click(getInput());

    // The list is virtualized, so this checks the indices group, which renders first.
    const labels = screen.getAllByRole('option').map(({ textContent }) => textContent);
    expect(labels.slice(0, 5)).toEqual([
      'alpha-search',
      'elastic-high-availabilityManaged',
      'elastic-on-demandManaged',
      'elastic-performantManaged',
      'zeta-search',
    ]);
  });

  it('can be emptied with select-all and Delete, and restores the last profile on blur', async () => {
    const { getInput, blur } = renderFlyout();

    await userEvent.click(getInput());
    await userEvent.keyboard('{Control>}a{/Control}{Delete}');
    expect(getInput()).toHaveValue('');

    await blur();
    expect(getInput()).toHaveValue('zeta-search');
  });

  it('keeps the profile checked while part of its name is deleted', async () => {
    const { getInput, blur } = renderFlyout();

    await userEvent.click(getInput());
    await userEvent.keyboard('{End}{Backspace}{Backspace}');
    expect(getInput()).toHaveValue('zeta-sear');
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('zeta-search');

    await blur();
    expect(getInput()).toHaveValue('zeta-search');
  });

  it('restores the last profile when typed text matches no profile', async () => {
    const { getInput, blur } = renderFlyout();

    await userEvent.click(getInput());
    await userEvent.keyboard('{Control>}a{/Control}nope');
    expect(getInput()).toHaveValue('nope');

    await blur();
    expect(getInput()).toHaveValue('zeta-search');
  });

  it('selects a profile typed in full, and can still be emptied afterwards', async () => {
    const { getInput, blur } = renderFlyout();

    await userEvent.click(getInput());
    await userEvent.keyboard('{Control>}a{/Control}alpha-search');
    await blur();
    expect(getInput()).toHaveValue('alpha-search');

    await userEvent.click(getInput());
    await userEvent.keyboard('{Control>}a{/Control}{Delete}');
    expect(getInput()).toHaveValue('');
  });
});

describe('RuleFlyout profile creation', () => {
  const getTypeRadio = (type: string) =>
    within(screen.getByTestId(`boostProfileTypePreset-${type}`)).getByRole('radio');

  it('shows the profile form in place of the rule, starting from its type', async () => {
    renderFlyout();

    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));

    expect(
      screen.getByRole('heading', { name: 'Create boost profile for rule "catalogs"' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('boostRuleProfile')).not.toBeInTheDocument();
    expect(screen.getByTestId('boostProfileName')).toHaveFocus();
    expect(getTypeRadio('indices')).toBeChecked();
  });

  it('creates the profile and selects it in the rule', async () => {
    const { getInput } = renderFlyout();

    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));
    await userEvent.type(screen.getByTestId('boostProfileName'), 'new-search');
    await userEvent.click(screen.getByTestId('boostProfileSaveAndUse'));

    expect(createProfile.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'new-search' }),
      expect.anything()
    );
    expect(screen.queryByTestId('boostProfileSaveAndUse')).not.toBeInTheDocument();
    expect(getInput()).toHaveValue('new-search');
    expect(screen.getByTestId('boostRuleCreateProfile')).toHaveFocus();
  });

  it('returns to the rule unchanged when cancelled', async () => {
    const { getInput } = renderFlyout();

    await userEvent.clear(screen.getByTestId('boostRulePriority'));
    await userEvent.type(screen.getByTestId('boostRulePriority'), '7');
    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));
    await userEvent.click(screen.getByTestId('boostProfileCancel'));

    expect(getInput()).toHaveValue('zeta-search');
    expect(screen.getByTestId('boostRulePriority')).toHaveValue(7);
    expect(screen.getByTestId('boostRuleCreateProfile')).toHaveFocus();
  });

  it("locks a default rule's new profile to the rule's type", async () => {
    renderFlyout(state.rules.find(({ name }) => name === DEFAULT_DATA_STREAMS_RULE_NAME));

    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));

    expect(getTypeRadio('data_streams')).toBeChecked();
    expect(getTypeRadio('data_streams')).toBeDisabled();
    expect(getTypeRadio('indices')).toBeDisabled();
  });
});
