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
  data_sources: [
    { name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 },
    { name: 'products', type: 'index', size_in_bytes: 1e9 },
  ],
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
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );

    await userEvent.click(
      within(screen.getByTestId('boostRuleProfile')).getByTestId('comboBoxSearchInput')
    );

    expect(screen.getByText('Data streams')).toBeInTheDocument();
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

  it("shows the selected profile's type in the field", () => {
    renderFlyout();

    expect(
      within(screen.getByTestId('boostRuleProfile')).getByTestId('boostRuleProfileType')
    ).toHaveTextContent('Indices');
  });

  it('lists profiles of both types when editing a custom rule', async () => {
    const { getInput } = renderFlyout();

    await userEvent.click(getInput());

    expect(screen.getByText('Data streams')).toBeInTheDocument();
  });

  it("only lists profiles of a default rule's type", async () => {
    const { getInput } = renderFlyout(
      state.rules.find(({ name }) => name === DEFAULT_DATA_STREAMS_RULE_NAME)
    );

    await userEvent.click(getInput());

    expect(screen.queryByText('Indices')).not.toBeInTheDocument();
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
    expect(getTypeRadio('data_streams')).toBeEnabled();
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

describe('RuleFlyout estimate', () => {
  const getEstimate = () => screen.queryByTestId('boostCostEstimate');
  const getPattern = () => screen.getByTestId('boostRulePattern');

  it("estimates the rule's targets", () => {
    renderFlyout();

    expect(getEstimate()).toHaveTextContent('1 index · 4 GB');
    expect(getEstimate()).toHaveAttribute('data-shown', 'true');
    expect(getEstimate()).toHaveAttribute('data-stale', 'false');
  });

  it('fades the last estimate while the pattern is cleared, and hides it once the field is left', async () => {
    const { blur } = renderFlyout();

    await userEvent.clear(getPattern());
    expect(getEstimate()).toHaveAttribute('data-stale', 'true');

    await blur();
    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });

  it("hides a new rule's estimate when its pattern matches nothing once the field is left", async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout initialProfileName="zeta-search" onClose={jest.fn()} />
      </IntlProvider>
    );
    expect(getEstimate()).toHaveAttribute('data-shown', 'false');

    // Above the existing catalogs rule, so the new rule takes over its index.
    await userEvent.clear(screen.getByTestId('boostRulePriority'));
    await userEvent.type(screen.getByTestId('boostRulePriority'), '2');
    await userEvent.type(getPattern(), 'catalog-*');
    expect(getEstimate()).toHaveAttribute('data-shown', 'true');
    expect(getEstimate()).toHaveAttribute('data-stale', 'false');
    // A new rule has nothing of its own to compare with, so there's no change to show.
    expect(screen.queryByText(/^(Up|Down) /)).not.toBeInTheDocument();

    await userEvent.clear(getPattern());
    await userEvent.type(getPattern(), 'nothing-*');
    expect(getEstimate()).toHaveAttribute('data-stale', 'true');

    await userEvent.click(screen.getByTestId('boostRulePriority'));
    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });

  it('shows an edited rule that matches nothing costing nothing, down from today', async () => {
    const { blur } = renderFlyout();

    await userEvent.clear(getPattern());
    await userEvent.type(getPattern(), 'nothing-*');
    await blur();

    expect(getEstimate()).toHaveAttribute('data-shown', 'true');
    expect(getEstimate()).toHaveTextContent('0 indices · 0 GB');
    expect(getEstimate()).toHaveTextContent('$0.00 at rest');
    // EUI's test build renders an icon's label as its text.
    expect(screen.getAllByText(/^Down /).length).toBeGreaterThan(0);
  });

  it("estimates the rule's targets with a profile being created for it", async () => {
    renderFlyout();

    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));

    expect(getEstimate()).toHaveTextContent('1 index · 4 GB');
  });
});

describe('RuleFlyout duplicate', () => {
  it('copies a rule under a new name', async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout duplicateOf={rule} onClose={jest.fn()} />
      </IntlProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Duplicate boost rule "catalogs"' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('boostRuleName')).toHaveValue('catalogs-copy');
    expect(screen.getByTestId('boostRulePattern')).toHaveValue('catalog-*');

    await userEvent.click(screen.getByTestId('boostRuleSave'));
    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        name: 'catalogs-copy',
        index_patterns: ['catalog-*'],
        boost_profile: 'zeta-search',
        priority: 1,
      },
      expect.anything()
    );
  });
});

describe('RuleFlyout pattern matches', () => {
  const renderNewRule = () =>
    render(
      <IntlProvider locale="en">
        <RuleFlyout initialProfileName="zeta-search" onClose={jest.fn()} />
      </IntlProvider>
    );

  it('counts and lists what the pattern matches', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('Matches 1 index');
    expect(screen.getByTestId('boostRulePatternMatches')).toHaveTextContent('catalog-fall');
  });

  it('says when nothing matches, in the same panel', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'nothing-*');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('Matches 0 indices');
    expect(screen.getByTestId('boostRulePatternMatches')).toHaveTextContent('Nothing matches yet.');
  });

  it('explains why the pattern is disabled before a profile is selected', async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );

    expect(screen.getByTestId('boostRulePattern')).toBeDisabled();
    // EUI turns off pointer events on disabled inputs, so hovers land on the row the tooltip wraps.
    await userEvent.hover(screen.getByText('Index pattern', { selector: 'label' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Select a boost profile to choose targets.'
    );
  });
});

describe('RuleFlyout superseded targets', () => {
  // A new rule at priority 0, below the saved catalogs rule at priority 1.
  const renderNewRule = () =>
    render(
      <IntlProvider locale="en">
        <RuleFlyout initialProfileName="zeta-search" onClose={jest.fn()} />
      </IntlProvider>
    );

  it('strikes through pattern matches that a higher-ranked rule keeps', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');

    const matches = within(screen.getByTestId('boostRulePatternMatches'));
    expect(matches.getByTestId('boostSupersededTarget')).toHaveTextContent('catalog-fall');
    expect(matches.getByText('Higher-ranked rule: catalogs')).toBeInTheDocument();
  });

  it('only notes the data sources in the list that a higher-ranked rule keeps', async () => {
    renderNewRule();

    await userEvent.click(screen.getByText('Select indices'));

    const picker = within(screen.getByTestId('boostRulePicker'));
    expect(picker.getByRole('option', { name: /catalog-fall/ })).toHaveTextContent(
      'Higher-ranked rule: catalogs'
    );
    expect(picker.getByRole('option', { name: /products/ })).not.toHaveTextContent(
      'Higher-ranked rule'
    );
  });
});
