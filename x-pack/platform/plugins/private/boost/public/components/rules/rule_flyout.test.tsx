/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, within } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostDataSource, BoostProfile, BoostRule, BoostState } from '../../../common/types';
import { RuleFlyout } from './rule_flyout';
import { setShowsEstimates } from '../../prototype/estimates_setting';

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
  settings: { default_profiles: DEFAULT_RULE_PROFILES },
  profiles: [...BUILTIN_PROFILES, customProfile('zeta-search'), customProfile('alpha-search')],
  rules: [...createDefaultRules(DEFAULT_RULE_PROFILES), rule],
  data_sources: [
    { name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 },
    { name: 'products', type: 'index', size_in_bytes: 1e9 },
  ],
};

const logsApp: BoostDataSource = {
  name: 'logs-app',
  type: 'data_stream',
  size_in_bytes: 3e9,
  data_ages: [
    { age_hours: 2, size_in_bytes: 1e9 },
    { age_hours: 24 * 30, size_in_bytes: 2e9 },
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
    // Managed profiles' names start with `_`, which sorts first.
    expect(labels.slice(0, 5)).toEqual([
      '_high-availabilityManaged',
      '_on-demandManaged',
      '_performantManaged',
      'alpha-search',
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
});

describe('RuleFlyout estimate', () => {
  const getEstimate = () => screen.queryByTestId('boostCostEstimate');
  const getPattern = () => screen.getByTestId('boostRulePattern');

  // Estimates are off until a tester turns them on, and each tester's setting stays in their
  // browser, so it's turned back off after each test.
  beforeEach(() => setShowsEstimates(true));
  afterEach(() => setShowsEstimates(false));

  it("estimates the rule's targets", () => {
    renderFlyout();

    expect(getEstimate()).toHaveTextContent('1 index4 GB');
    expect(getEstimate()).toHaveAttribute('data-shown', 'true');
    expect(getEstimate()).toHaveAttribute('data-stale', 'false');
    expect(screen.getByTestId('boostCostEstimate-atRest')).toBeInTheDocument();
    expect(screen.queryByTestId('boostCostEstimateTimeline')).not.toBeInTheDocument();
  });

  describe('with a data stream', () => {
    const indices = state.data_sources;
    const logsRule: BoostRule = {
      name: 'logs',
      index_patterns: ['logs-*'],
      boost_profile: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
      priority: 1,
      is_builtin: false,
    };
    beforeEach(() => {
      state.data_sources = [...indices, logsApp];
    });
    afterEach(() => {
      state.data_sources = indices;
    });

    it("splits a data streams rule's estimate between its profile's periods", () => {
      renderFlyout(logsRule);

      expect(getEstimate()).toHaveTextContent('1 data stream3 GB');
      expect(screen.getByTestId('boostCostEstimate-atRest')).toBeInTheDocument();
      expect(screen.getByTestId('boostCostEstimateTimeline-recent')).toHaveTextContent(
        'Recent1 GB'
      );
      expect(screen.getByTestId('boostCostEstimateTimeline-background')).toHaveTextContent(
        'Background2 GB'
      );
      // The profile's standard period, from 1 to 7 days old, holds none of the data stream's data.
      expect(screen.getByTestId('boostCostEstimateTimeline-standard')).toHaveTextContent(
        'Standard0 GB'
      );
    });

    it("shows a period's boost and cost in a tooltip", async () => {
      renderFlyout(logsRule);

      expect(screen.getByTestId('boostCostEstimateTimeline-recent')).not.toHaveTextContent('$');
      await userEvent.hover(
        within(screen.getByTestId('boostCostEstimateTimeline-recent')).getByText('Recent')
      );

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(/^Recent\d[\d,.]*–[\d,.]+ boost\$/);
      expect(tooltip).toHaveTextContent(/VCUs$/);
    });

    it("shows a period's boost without its cost while estimates are off", async () => {
      setShowsEstimates(false);
      renderFlyout(logsRule);

      // What the rule applies to stays, without its cost.
      expect(screen.getByTestId('boostCostEstimate')).toHaveTextContent('Applies to');
      expect(screen.getByTestId('boostCostEstimate')).not.toHaveTextContent('Search cost per hour');
      await userEvent.hover(
        within(screen.getByTestId('boostCostEstimateTimeline-recent')).getByText('Recent')
      );

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(/boost$/);
      expect(tooltip).not.toHaveTextContent('$');
    });

    it('hides a data streams estimate once the rule switches to an indices profile', async () => {
      render(
        <IntlProvider locale="en">
          <RuleFlyout
            initialProfileName={BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days}
            onClose={jest.fn()}
          />
        </IntlProvider>
      );
      await userEvent.type(getPattern(), 'logs-*');
      expect(getEstimate()).toHaveAttribute('data-shown', 'true');

      const profileInput = within(screen.getByTestId('boostRuleProfile')).getByTestId(
        'comboBoxSearchInput'
      );
      await userEvent.click(profileInput);
      await userEvent.keyboard('{Control>}a{/Control}{Delete}');
      // While the profile is cleared, the last estimate stays, faded.
      expect(getEstimate()).toHaveAttribute('data-stale', 'true');

      await userEvent.keyboard('alpha');
      await userEvent.click(screen.getByRole('option', { name: /alpha-search/ }));

      expect(getEstimate()).toHaveAttribute('data-shown', 'false');
    });
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
    expect(screen.queryByText(/(up|down) from/)).not.toBeInTheDocument();

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
    expect(getEstimate()).toHaveTextContent('0 indices0 GB');
    expect(getEstimate()).toHaveTextContent('$0.00 at rest');
    // Each end has its own indicator. EUI's test build renders an icon's label as its text.
    expect(screen.getByText(/^At rest, down from/)).toBeInTheDocument();
    expect(screen.getByText(/^At peak, down from/)).toBeInTheDocument();
  });

  describe('with a profile whose min boost is higher but max boost lower', () => {
    const profiles = state.profiles;
    const steadySearch: BoostProfile = {
      name: 'steady-search',
      type: 'indices',
      is_builtin: false,
      min_boost: 2,
      max_boost: 3,
      high_availability: 'none',
      prewarm: false,
      pinned: false,
    };
    beforeEach(() => {
      state.profiles = [...profiles, steadySearch];
    });
    afterEach(() => {
      state.profiles = profiles;
    });

    it('shows each end moving its own way', async () => {
      const { getInput, blur } = renderFlyout();

      await userEvent.click(getInput());
      await userEvent.keyboard('{Control>}a{/Control}steady-search');
      await blur();

      expect(screen.getByText(/^At rest, up from/)).toBeInTheDocument();
      expect(screen.getByText(/^At peak, down from/)).toBeInTheDocument();
    });
  });

  it("estimates the rule's targets with a profile being created for it", async () => {
    renderFlyout();

    await userEvent.click(screen.getByTestId('boostRuleCreateProfile'));

    expect(getEstimate()).toHaveTextContent('1 index4 GB');
  });
});

describe('RuleFlyout priority', () => {
  const getPriority = () => screen.getByTestId('boostRulePriority');

  it('only takes digits as they are typed', async () => {
    renderFlyout();

    await userEvent.clear(getPriority());
    await userEvent.type(getPriority(), '-1.5e+');

    expect(getPriority()).toHaveValue(15);
    expect(getPriority()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it.each([
    ['nothing', '', 0],
    ['a negative number', '-3', 0],
    ['a fraction', '2.7', 2],
  ])(
    'corrects %s, such as a pasted value, when the field is left',
    async (_case, value, expected) => {
      renderFlyout();

      await userEvent.clear(getPriority());
      if (value) {
        await userEvent.paste(value);
      }
      await userEvent.tab();

      expect(getPriority()).toHaveValue(expected);
    }
  );

  it('saves a priority of 0 instead of nothing, without an error', async () => {
    mutation.mutate.mockClear();
    renderFlyout();

    await userEvent.clear(getPriority());
    await userEvent.click(screen.getByTestId('boostRuleSave'));

    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 0 }),
      expect.anything()
    );
    expect(getPriority()).toHaveValue(0);
  });
});

describe('RuleFlyout duplicate', () => {
  it('copies a rule under a new name, saving it once it no longer ties with the rule', async () => {
    mutation.mutate.mockClear();
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

    // An exact copy ties with the rule, which Elasticsearch rejects.
    await userEvent.click(screen.getByTestId('boostRuleSave'));
    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText('Ties with rule "catalogs" on the same indices. Choose another priority.')
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByTestId('boostRulePriority'));
    await userEvent.type(screen.getByTestId('boostRulePriority'), '2');
    await userEvent.click(screen.getByTestId('boostRuleSave'));
    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        name: 'catalogs-copy',
        index_patterns: ['catalog-*'],
        boost_profile: 'zeta-search',
        priority: 2,
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

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('1 exact match');
    expect(screen.getByTestId('boostRulePatternMatches')).toHaveTextContent('catalog-fall');
    // No index is hidden, so there's nothing to show.
    expect(screen.getByTestId('boostRuleShowHidden')).toBeDisabled();
  });

  it('highlights the parts of each match that the pattern spells out', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'cat*-fa*');

    const highlights = within(screen.getByTestId('boostRulePatternMatches'))
      .getAllByText((_content, element) => element?.tagName === 'MARK')
      .map(({ textContent }) => textContent);
    expect(highlights).toEqual(['cat', '-fa']);
  });

  it('lists exact matches without partial ones', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');

    expect(screen.getByRole('region', { name: 'Exact matches' })).toHaveTextContent('catalog-fall');
    expect(screen.queryByTestId('boostRulePartialMatch')).not.toBeInTheDocument();
  });

  it('shows what a partial pattern could match until it matches something', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'cat');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('1 partial match');
    expect(screen.getByRole('region', { name: 'Partial matches' })).toBeInTheDocument();
    const [partialMatch] = screen.getAllByTestId('boostRulePartialMatch');
    expect(partialMatch).toHaveTextContent('catalog-fall');
    // A pattern widened to match it would still rank below the saved catalogs rule.
    expect(within(partialMatch).getByTestId('boostSupersededTarget')).toHaveTextContent(
      'catalog-fall'
    );
    expect(within(partialMatch).getByTestId('boostSupersedingRule')).toHaveTextContent('catalogs');
  });

  it('marks each exact match, or each partial match, with its icon', async () => {
    renderNewRule();
    // The match icons, leaving out the icon of a rule that ranks higher.
    const getIcons = () =>
      Array.from(
        screen.getByTestId('boostRulePatternMatches').querySelectorAll('[data-euiicon-type]'),
        (icon) => icon.getAttribute('data-euiicon-type')
      ).filter((iconType) => iconType !== 'sortAscending');

    const getIcon = () =>
      screen.getByTestId('boostRulePatternMatches').querySelector('[data-euiicon-type]');

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');
    expect(getIcons()).toEqual(['checkCircle']);
    // The saved catalogs rule ranks higher, so the match is disabled like its struck-through name.
    const {
      result: { current: theme },
    } = renderHook(() => useEuiTheme());
    expect(getIcon()).toHaveAttribute('color', theme.euiTheme.colors.textDisabled);

    await userEvent.clear(screen.getByTestId('boostRulePattern'));
    await userEvent.type(screen.getByTestId('boostRulePattern'), 'prod');
    expect(getIcons()).toEqual(['partial']);
    // Nothing ranks higher for products, so its icon matches its name's color.
    expect(getIcon()).toHaveAttribute('color', theme.euiTheme.colors.textParagraph);
    expect(screen.queryByTestId('boostSupersededTarget')).not.toBeInTheDocument();
  });

  it('marks the matches among every data source, keeping the rest aligned', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');
    await userEvent.click(screen.getByTestId('boostRuleAllTab'));

    const [catalogFall, products] = screen.getAllByTestId('boostRuleAvailableTarget');
    expect(within(catalogFall).getByTitle('Exact match')).toBeInTheDocument();
    expect(products.querySelector('[data-euiicon-type]')).toHaveAttribute(
      'data-euiicon-type',
      'empty'
    );
    // As in the matching list, a match that a higher-ranked rule keeps is struck through, beside
    // that rule.
    expect(within(catalogFall).getByTestId('boostSupersededTarget')).toHaveTextContent(
      'catalog-fall'
    );
    expect(within(catalogFall).getByTestId('boostSupersedingRule')).toHaveTextContent('catalogs');
    expect(within(products).queryByTestId('boostSupersededTarget')).not.toBeInTheDocument();
  });

  it('finds partial matches by any part of their name', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'fall');

    expect(screen.getByTestId('boostRulePartialMatch')).toHaveTextContent('catalog-fall');
  });

  it('finds partial matches for a pattern that only needs a leading wildcard', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'alog-*');

    expect(screen.getByTestId('boostRulePartialMatch')).toHaveTextContent('catalog-fall');
  });

  it('says when nothing matches, in the same panel', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'nothing-*');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('0 matches');
    expect(screen.getByTestId('boostRulePatternMatches')).toHaveTextContent('No matches detected');
  });

  it('requires the pattern to match something before saving', async () => {
    mutation.mutate.mockClear();
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRuleName'), 'new-rule');
    await userEvent.type(screen.getByTestId('boostRulePattern'), 'cat');
    await userEvent.click(screen.getByTestId('boostRuleSave'));

    expect(mutation.mutate).not.toHaveBeenCalled();
    const message = 'Enter a pattern that exactly matches at least one index.';
    expect(screen.getByText(message)).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('boostRulePattern'), '*');

    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('still saves a rule whose saved pattern no longer matches anything', async () => {
    mutation.mutate.mockClear();
    renderFlyout({ ...rule, index_patterns: ['retired-*'] });

    await userEvent.click(screen.getByTestId('boostRuleSave'));

    expect(mutation.mutate).toHaveBeenCalled();
  });

  it('asks for a pattern until one is entered', () => {
    renderNewRule();

    expect(screen.getByTestId('boostRulePatternMatchesEmpty')).toHaveTextContent(
      'Enter an index pattern to see matches'
    );
    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('0 matches');
  });

  it('lists every index, highlighting the same matches', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), 'catalog-*');
    await userEvent.click(screen.getByTestId('boostRuleAllTab'));

    const [catalog, products] = screen.getAllByTestId('boostRuleAvailableTarget');
    expect(catalog).toHaveTextContent('catalog-fall');
    expect(within(catalog).getByText('catalog-', { selector: 'mark' })).toBeInTheDocument();
    expect(products).toHaveTextContent('products');
    expect(products.querySelector('mark')).toBeNull();
  });

  it('keeps showing every index while the pattern changes', async () => {
    renderNewRule();

    await userEvent.click(screen.getByTestId('boostRuleAllTab'));
    await userEvent.type(screen.getByTestId('boostRulePattern'), 'prod');

    expect(screen.getByTestId('boostRuleAllTab')).toHaveAttribute('aria-selected', 'true');
    // Nothing matches exactly, so the partial match is highlighted, as in the matching list.
    expect(screen.getByText('prod', { selector: 'mark' })).toBeInTheDocument();
  });

  it('says when there are no data sources of the type to list', async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout
          initialProfileName={BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_1_day}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

    await userEvent.click(screen.getByTestId('boostRuleAllTab'));

    expect(screen.getByTestId('boostRulePatternMatchesEmpty')).toHaveTextContent(
      'No data streams detected'
    );
  });

  it('disables both tabs, and the switch that shows hidden data sources, until a profile is selected', () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );

    expect(screen.getByTestId('boostRulePatternMatchesEmpty')).toHaveTextContent(
      'Enter an index pattern to see matches'
    );
    const matchingTab = screen.getByTestId('boostRuleMatchingTab');
    expect(matchingTab).toBeDisabled();
    expect(matchingTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('boostRuleAllTab')).toBeDisabled();
    expect(screen.getByTestId('boostRuleShowHidden')).toBeDisabled();
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
      'Select a boost profile to input an index pattern.'
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
    expect(matches.getByTestId('boostSupersedingRule')).toHaveTextContent('catalogs');
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

  it('strikes through data sources in the list that a higher-ranked rule keeps, until this rule outranks it', async () => {
    renderNewRule();
    await userEvent.click(screen.getByText('Select indices'));
    const getOption = (name: RegExp) =>
      within(screen.getByTestId('boostRulePicker')).getByRole('option', { name });

    // Whether or not it's selected.
    expect(
      within(getOption(/catalog-fall/)).getByTestId('boostSupersededTarget')
    ).toHaveTextContent('catalog-fall');
    expect(within(getOption(/products/)).queryByTestId('boostSupersededTarget')).toBeNull();

    // Above the saved catalogs rule's priority of 1.
    await userEvent.clear(screen.getByTestId('boostRulePriority'));
    await userEvent.type(screen.getByTestId('boostRulePriority'), '2');

    expect(within(getOption(/catalog-fall/)).queryByTestId('boostSupersededTarget')).toBeNull();
  });

  it('explains a higher-ranked rule when its data source in the list is hovered', async () => {
    renderNewRule();

    await userEvent.click(screen.getByText('Select indices'));
    const option = within(screen.getByTestId('boostRulePicker')).getByRole('option', {
      name: /catalog-fall/,
    });
    await userEvent.hover(within(option).getByText('catalog-fall'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '"catalogs" ranks higher, so it applies instead.'
    );
  });

  it('counts what is selected', async () => {
    renderNewRule();

    await userEvent.click(screen.getByText('Select indices'));
    expect(screen.getByTestId('boostRulePickedCount')).toHaveTextContent('0 selected');

    await userEvent.click(
      within(screen.getByTestId('boostRulePicker')).getByRole('option', { name: /products/ })
    );
    expect(screen.getByTestId('boostRulePickedCount')).toHaveTextContent('1 selected');
  });
});

describe('RuleFlyout hidden data sources', () => {
  const indices = state.data_sources;
  beforeEach(() => {
    state.data_sources = [
      ...indices,
      { name: '.catalog-archive', type: 'index', size_in_bytes: 1e9, hidden: true },
    ];
  });
  afterEach(() => {
    state.data_sources = indices;
  });

  const renderNewRule = () =>
    render(
      <IntlProvider locale="en">
        <RuleFlyout initialProfileName="zeta-search" onClose={jest.fn()} />
      </IntlProvider>
    );

  it('counts hidden matches, but only lists them once they are shown', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), '*');

    // The rule would apply to the hidden index all the same.
    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('3 exact matches');
    const matches = within(screen.getByRole('region', { name: 'Exact matches' }));
    expect(matches.queryByText('.catalog-archive')).not.toBeInTheDocument();
    expect(matches.getByTestId('boostRuleHiddenNotShown')).toHaveTextContent(
      '1 hidden index not shown'
    );

    await userEvent.click(screen.getByTestId('boostRuleShowHidden'));

    expect(matches.getByText('.catalog-archive')).toBeInTheDocument();
    expect(matches.getByTestId('boostHiddenBadge')).toBeInTheDocument();
    expect(matches.queryByTestId('boostRuleHiddenNotShown')).not.toBeInTheDocument();
  });

  it('only counts hidden matches among every index, as the matching list does', async () => {
    renderNewRule();
    await userEvent.type(screen.getByTestId('boostRulePattern'), 'products');
    await userEvent.click(screen.getByTestId('boostRuleAllTab'));

    // The hidden index doesn't match, so it isn't counted.
    expect(screen.queryByTestId('boostRuleHiddenNotShown')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByTestId('boostRulePattern'));
    await userEvent.type(screen.getByTestId('boostRulePattern'), '*');

    expect(screen.getByTestId('boostRuleHiddenNotShown')).toHaveTextContent(
      '1 hidden index not shown'
    );
  });

  it('counts a pattern that only matches hidden data sources as matching', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), '.catalog-*');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent('1 exact match');
    expect(screen.getByRole('region', { name: 'Exact matches' })).toHaveTextContent(
      /^1 hidden index not shown$/
    );
  });

  it('leaves hidden data sources out of the list to select from until shown, except selected ones', async () => {
    renderNewRule();
    await userEvent.click(screen.getByText('Select indices'));
    const picker = within(screen.getByTestId('boostRulePicker'));
    expect(picker.queryByRole('option', { name: /\.catalog-archive/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('boostRuleShowHidden'));
    const option = picker.getByRole('option', { name: /\.catalog-archive/ });
    expect(within(option).getByTestId('boostHiddenBadge')).toBeInTheDocument();
    await userEvent.click(option);

    // Selected, it stays in view once hidden ones are left out again.
    await userEvent.click(screen.getByTestId('boostRuleShowHidden'));
    expect(picker.getByRole('option', { name: /\.catalog-archive/ })).toBeInTheDocument();
    expect(screen.getByTestId('boostRulePickedCount')).toHaveTextContent('1 selected');
  });
});
