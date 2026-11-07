/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, within } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
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
import { setPrototypeSettings } from '../../prototype/prototype_settings';

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

// The list's switches are in its options popover, which typing elsewhere closes.
const getListOption = async (testSubj: string): Promise<HTMLElement> => {
  if (!screen.queryByTestId(testSubj)) {
    await userEvent.click(screen.getByTestId('boostRuleListOptions'));
    await waitForEuiPopoverOpen();
  }
  return screen.getByTestId(testSubj);
};
const clickListOption = async (testSubj: string) => {
  await userEvent.click(await getListOption(testSubj));
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

  it("lists only profiles of the rule's type when editing, since Elasticsearch can't switch it", async () => {
    const { getInput } = renderFlyout();

    await userEvent.click(getInput());

    expect(screen.getByRole('option', { name: 'zeta-search' })).toBeInTheDocument();
    expect(screen.queryByText('Data streams')).not.toBeInTheDocument();
    expect(screen.getByTestId('boostRuleProfile').closest('.euiFormRow')).toHaveTextContent(
      "Lists only indices profiles, since a rule can't switch types after it's created."
    );
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

  // Estimates are off until someone turns them on, and the prototype's settings outlast each test,
  // so they're turned back off after each one.
  beforeEach(() => setPrototypeSettings({ shows_estimates: true }));
  afterEach(() => setPrototypeSettings({ shows_estimates: false }));

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
      void setPrototypeSettings({ shows_estimates: false });
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

  it('hides the estimate as soon as the pattern is cleared', async () => {
    renderFlyout();

    await userEvent.clear(getPattern());
    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });

  it("hides a new rule's estimate as soon as its pattern matches nothing", async () => {
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

  it("hides an edited rule's estimate once it matches nothing, without costs to compare", async () => {
    await setPrototypeSettings({ shows_estimates: false });
    renderFlyout();
    expect(getEstimate()).toHaveAttribute('data-shown', 'true');

    await userEvent.clear(getPattern());
    await userEvent.type(getPattern(), 'nothing-*');

    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
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
    expect(screen.getByText('Ties with rule "catalogs".')).toBeInTheDocument();

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
  const getCount = () => screen.getByTestId('boostRulePatternMatchCount');
  const getPattern = () => screen.getByTestId('boostRulePattern');
  const getListed = () =>
    screen.queryAllByRole('option').map(({ textContent }) => textContent?.split('Higher')[0]);

  it('lists every index until something is typed, and then filters it to what matches', async () => {
    renderNewRule();
    // It only counts matches, so until something is typed, it says what the list is for.
    expect(getCount()).toHaveTextContent(/^Enter a pattern or select an index$/);
    expect(getListed()).toEqual(['catalog-fall', 'products']);

    await userEvent.type(getPattern(), 'catalog-*');
    expect(getCount()).toHaveTextContent(/^1 exact match$/);
    expect(getListed()).toEqual(['catalog-fall']);

    await userEvent.type(getPattern(), 'zzz');
    expect(getCount()).toHaveTextContent(/^0 matches$/);

    await userEvent.clear(getPattern());
    expect(getListed()).toEqual(['catalog-fall', 'products']);
  });

  it('clears the field with its clear button, listing everything again', async () => {
    renderNewRule();
    // Nothing to clear yet.
    expect(screen.queryByTestId('boostRulePatternClear')).not.toBeInTheDocument();
    // The row's label still names the input inside the clear button's layout.
    const label = screen.getByText('Index pattern or name', { selector: 'label' });
    expect(getPattern()).toHaveAttribute('id', label.getAttribute('for'));

    await userEvent.type(getPattern(), 'catalog-*');
    await userEvent.click(screen.getByTestId('boostRulePatternClear'));

    expect(getPattern()).toHaveValue('');
    expect(getPattern()).toHaveFocus();
    expect(getListed()).toEqual(['catalog-fall', 'products']);
    expect(screen.queryByTestId('boostRulePatternClear')).not.toBeInTheDocument();
  });

  it('keeps unmatched names listed beside the matches once asked', async () => {
    renderNewRule();
    // Everything is listed until something is typed, as its tooltip says.
    const showUnmatched = await getListOption('boostRuleShowUnmatched');
    expect(showUnmatched).toBeDisabled();
    await userEvent.hover(screen.getByText('Show unmatched'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      "The list isn't filtered until you enter a pattern or name."
    );

    await userEvent.type(getPattern(), 'catalog-*');
    await clickListOption('boostRuleShowUnmatched');

    expect(getListed()).toEqual(['catalog-fall', 'products']);
    // Still counting what matches.
    expect(getCount()).toHaveTextContent(/^1 exact match$/);
  });

  it('highlights the parts of each match that the pattern spells out', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'cat*-fa*');

    const highlights = within(screen.getByTestId('boostRulePatternMatches'))
      .getAllByText((_content, element) => element?.tagName === 'MARK')
      .map(({ textContent }) => textContent);
    expect(highlights).toEqual(['cat', '-fa']);
  });

  it('lists exact matches without partial ones', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'catalog-*');

    expect(screen.getByRole('listbox', { name: 'Exact matches' })).toHaveTextContent(
      'catalog-fall'
    );
    expect(screen.queryByTestId('boostRulePartialMatch')).not.toBeInTheDocument();
  });

  it('shows what a partial pattern could match until it matches something', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'cat');

    expect(getCount()).toHaveTextContent(/^1 partial match$/);
    expect(screen.getByRole('listbox', { name: 'Partial matches' })).toBeInTheDocument();
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
        screen
          .getByTestId('boostRulePatternMatches')
          .querySelectorAll('[role=option] [data-euiicon-type]'),
        (icon) => icon.getAttribute('data-euiicon-type')
      ).filter((iconType) => iconType !== 'sortAscending');
    const getIcon = () =>
      screen
        .getByTestId('boostRulePatternMatches')
        .querySelector('[role=option] [data-euiicon-type]');
    const {
      result: { current: theme },
    } = renderHook(() => useEuiTheme());

    await userEvent.type(getPattern(), 'catalog-*');
    expect(getIcons()).toEqual(['check']);
    // The saved catalogs rule ranks higher, so the match is disabled like its struck-through name.
    expect(getIcon()).toHaveAttribute('color', theme.euiTheme.colors.textDisabled);

    await userEvent.clear(getPattern());
    await userEvent.type(getPattern(), 'prod');
    expect(getIcons()).toEqual(['partial']);
    // Nothing ranks higher for products, so its icon matches its name's color.
    expect(getIcon()).toHaveAttribute('color', theme.euiTheme.colors.textParagraph);
    expect(screen.queryByTestId('boostSupersededTarget')).not.toBeInTheDocument();

    // An exact match that nothing outranks takes the primary color.
    await userEvent.clear(getPattern());
    await userEvent.type(getPattern(), 'products');
    expect(getIcon()).toHaveAttribute('color', theme.euiTheme.colors.textPrimary);
  });

  it('marks the matches among every data source, keeping the rest aligned', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'catalog-*');
    await clickListOption('boostRuleShowUnmatched');

    const [catalogFall, products] = screen.getAllByTestId('boostRuleAvailableTarget');
    expect(within(catalogFall).getByTitle('Exact match')).toBeInTheDocument();
    expect(products.querySelector('[data-euiicon-type]')).toHaveAttribute(
      'data-euiicon-type',
      'empty'
    );
    // As in the filtered list, a match that a higher-ranked rule keeps is struck through, beside
    // that rule.
    expect(within(catalogFall).getByTestId('boostSupersededTarget')).toHaveTextContent(
      'catalog-fall'
    );
    expect(within(catalogFall).getByTestId('boostSupersedingRule')).toHaveTextContent('catalogs');
    expect(within(products).queryByTestId('boostSupersededTarget')).not.toBeInTheDocument();
    // Its highlights are the same as the filtered list's.
    expect(within(catalogFall).getByText('catalog-', { selector: 'mark' })).toBeInTheDocument();
    expect(products.querySelector('mark')).toBeNull();
  });

  it('finds partial matches by any part of their name', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'fall');

    expect(screen.getByTestId('boostRulePartialMatch')).toHaveTextContent('catalog-fall');
  });

  it('finds partial matches for a pattern that only needs a leading wildcard', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'alog-*');

    expect(screen.getByTestId('boostRulePartialMatch')).toHaveTextContent('catalog-fall');
  });

  it('says when nothing matches, in the same panel', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'nothing-*');

    expect(getCount()).toHaveTextContent(/^0 matches$/);
    expect(screen.getByTestId('boostRulePatternMatches')).toHaveTextContent('No matches detected');
  });

  it('saves a pattern that matches nothing yet, as Elasticsearch allows', async () => {
    mutation.mutate.mockClear();
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRuleName'), 'new-rule');
    await userEvent.type(getPattern(), 'upcoming-*');
    await userEvent.click(screen.getByTestId('boostRuleSave'));

    expect(mutation.mutate).toHaveBeenCalled();
  });

  it('keeps unmatched names listed while the pattern changes', async () => {
    renderNewRule();

    await userEvent.type(getPattern(), 'p');
    await clickListOption('boostRuleShowUnmatched');
    await userEvent.type(getPattern(), 'rod');

    expect(getListed()).toEqual(['catalog-fall', 'products']);
    // Nothing matches exactly, so the partial match is highlighted, as in the filtered list.
    expect(screen.getByText('prod', { selector: 'mark' })).toBeInTheDocument();
  });

  it('says when there are no data sources of the type to list', () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout
          initialProfileName={BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_1_day}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('boostRulePatternMatchesEmpty')).toHaveTextContent(
      'No data streams detected'
    );
    // Elasticsearch calls the syntax an index pattern for data streams too.
    expect(screen.getByText('Index pattern or name', { selector: 'label' })).toBeInTheDocument();
  });

  it('lists what the rule can target once a profile sets its type', async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );
    expect(screen.queryByTestId('boostRulePatternMatches')).not.toBeInTheDocument();

    await userEvent.click(
      within(screen.getByTestId('boostRuleProfile')).getByTestId('comboBoxSearchInput')
    );
    await userEvent.click(screen.getByRole('option', { name: /^zeta-search/ }));

    expect(getCount()).toHaveTextContent(/^Enter a pattern or select an index$/);
    expect(getListed()).toEqual(['catalog-fall', 'products']);
  });

  it("says why hidden indices can't be shown when there are none", async () => {
    renderNewRule();

    expect(await getListOption('boostRuleShowHidden')).toBeDisabled();
    await userEvent.hover(screen.getByText('Show hidden'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('There are no hidden indices.');
  });

  it('explains why the field is disabled before a profile is selected', async () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );

    expect(getPattern()).toBeDisabled();
    // EUI turns off pointer events on disabled inputs, so hovers land on the row the tooltip wraps.
    await userEvent.hover(screen.getByText('Index pattern or name', { selector: 'label' }));

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
    expect(matches.getByTestId('boostSupersedingRule')).toHaveTextContent('catalogs');
  });

  // A new rule opens on every index, which notes what a higher-ranked rule would keep if named.
  const getRow = (name: string) =>
    screen
      .getAllByTestId('boostRuleAvailableTarget')
      .find((row) => row.textContent?.startsWith(name)) as HTMLElement;

  it('notes the data sources in the list that a higher-ranked rule would keep if chosen', () => {
    renderNewRule();

    expect(within(getRow('catalog-fall')).getByTestId('boostSupersedingRule')).toHaveTextContent(
      'catalogs'
    );
    expect(within(getRow('products')).queryByTestId('boostSupersedingRule')).toBeNull();
  });

  it('strikes through data sources in the list that a higher-ranked rule keeps, until this rule outranks it', async () => {
    renderNewRule();

    expect(within(getRow('catalog-fall')).getByTestId('boostSupersededTarget')).toHaveTextContent(
      'catalog-fall'
    );
    expect(within(getRow('products')).queryByTestId('boostSupersededTarget')).toBeNull();

    // Above the saved catalogs rule's priority of 1.
    await userEvent.clear(screen.getByTestId('boostRulePriority'));
    await userEvent.type(screen.getByTestId('boostRulePriority'), '2');

    expect(within(getRow('catalog-fall')).queryByTestId('boostSupersededTarget')).toBeNull();
  });

  it('explains a higher-ranked rule when its icon in the list is hovered', async () => {
    renderNewRule();

    await userEvent.hover(within(getRow('catalog-fall')).getByTestId('boostSupersedingRule'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '"catalogs" ranks higher, so it applies instead.'
    );
  });
});

describe('RuleFlyout choosing from the list', () => {
  const getField = (): HTMLInputElement => screen.getByTestId('boostRulePattern');
  // By its text, since a highlighted name's accessible name is split around its highlights.
  const choose = (name: string) => {
    const option = screen
      .getAllByRole('option')
      .find(({ textContent }) => textContent?.startsWith(name));
    if (!option) {
      throw new Error(`No ${name} to choose`);
    }
    return userEvent.click(option);
  };
  const save = () => userEvent.click(screen.getByTestId('boostRuleSave'));
  const renderNewRule = () =>
    render(
      <IntlProvider locale="en">
        <RuleFlyout initialProfileName="zeta-search" onClose={jest.fn()} />
      </IntlProvider>
    );

  beforeEach(() => mutation.mutate.mockClear());

  it('uses a name chosen from the list, replacing what the field had', async () => {
    renderNewRule();
    await userEvent.type(screen.getByTestId('boostRuleName'), 'one-index');
    await userEvent.type(getField(), 'cat');

    await choose('catalog-fall');
    expect(getField()).toHaveValue('catalog-fall');
    // The chosen name matches exactly.
    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent(/^1 exact match$/);

    // Shown beside the match, another name replaces it.
    await clickListOption('boostRuleShowUnmatched');
    await choose('products');
    expect(getField()).toHaveValue('products');

    await choose('catalog-fall');
    expect(getField()).toHaveValue('catalog-fall');
    await save();
    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ index_patterns: ['catalog-fall'] }),
      expect.anything()
    );
  });

  it("can't choose until a profile sets what to choose from", () => {
    render(
      <IntlProvider locale="en">
        <RuleFlyout onClose={jest.fn()} />
      </IntlProvider>
    );

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('asks for one name or pattern for a rule saved with several, which the prototype once allowed', async () => {
    renderFlyout({ ...rule, index_patterns: ['catalog-fall', 'products'], priority: 2 });
    expect(getField()).toHaveValue('catalog-fall, products');

    await save();
    expect(
      screen.getByText('Enter one pattern or name, without commas or spaces.')
    ).toBeInTheDocument();
    expect(mutation.mutate).not.toHaveBeenCalled();

    // The field's commas make it invalid, so it has no matches to filter the list by.
    await clickListOption('boostRuleShowUnmatched');
    await choose('products');
    await save();
    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ index_patterns: ['products'] }),
      expect.anything()
    );
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
    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent(/^3 exact matches$/);
    const matches = within(screen.getByTestId('boostRulePatternMatches'));
    expect(matches.queryByText('.catalog-archive')).not.toBeInTheDocument();
    // After the others, so it adds to them.
    expect(matches.getByTestId('boostRuleHiddenNotShown')).toHaveTextContent(/^\+1 hidden index$/);

    await clickListOption('boostRuleShowHidden');

    expect(matches.getByText('.catalog-archive')).toBeInTheDocument();
    expect(matches.getByTestId('boostHiddenBadge')).toBeInTheDocument();
    expect(matches.queryByTestId('boostRuleHiddenNotShown')).not.toBeInTheDocument();
    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent(/^3 exact matches$/);
  });

  it('only counts hidden matches among unmatched names, as the filtered list does', async () => {
    renderNewRule();
    await userEvent.type(screen.getByTestId('boostRulePattern'), 'products');
    await clickListOption('boostRuleShowUnmatched');

    // The hidden index doesn't match, so it isn't counted.
    expect(screen.queryByTestId('boostRuleHiddenNotShown')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByTestId('boostRulePattern'));
    await userEvent.type(screen.getByTestId('boostRulePattern'), '*');

    expect(screen.getByTestId('boostRuleHiddenNotShown')).toHaveTextContent(/^\+1 hidden index$/);
  });

  it('counts a pattern that only matches hidden data sources as matching', async () => {
    renderNewRule();

    await userEvent.type(screen.getByTestId('boostRulePattern'), '.catalog-*');

    expect(screen.getByTestId('boostRulePatternMatchCount')).toHaveTextContent(/^1 exact match$/);
    // With nothing before it, it adds to nothing.
    expect(screen.getByTestId('boostRuleHiddenNotShown')).toHaveTextContent(/^1 hidden index$/);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('colors the hidden ones it leaves out like the matches they are', async () => {
    const {
      result: { current: theme },
    } = renderHook(() => useEuiTheme());
    const getNoteColor = () =>
      getComputedStyle(screen.getByTestId('boostRuleHiddenNotShown')).color.toLowerCase();
    const toRgb = (hex: string) => {
      const [red, green, blue] = [1, 3, 5].map((start) =>
        parseInt(hex.slice(start, start + 2), 16)
      );
      return `rgb(${red}, ${green}, ${blue})`;
    };
    const { unmount } = renderNewRule();

    // An exact match, like the rest, takes the primary color.
    await userEvent.type(screen.getByTestId('boostRulePattern'), '.catalog-*');
    expect(getNoteColor()).toBe(toRgb(theme.euiTheme.colors.textPrimary));

    // A partial one doesn't.
    await userEvent.clear(screen.getByTestId('boostRulePattern'));
    await userEvent.type(screen.getByTestId('boostRulePattern'), '.catalog');
    expect(getNoteColor()).not.toBe(toRgb(theme.euiTheme.colors.textPrimary));
    unmount();

    // A higher-ranked rule keeps it, so it's disabled, like a match struck through.
    const { rules } = state;
    state.rules = [...rules, { ...rule, name: 'archives', index_patterns: ['.catalog-*'] }];
    renderNewRule();
    await userEvent.type(screen.getByTestId('boostRulePattern'), '.catalog-*');
    expect(getNoteColor()).toBe(toRgb(theme.euiTheme.colors.textDisabled));
    state.rules = rules;
  });

  it('lists hidden data sources to choose from once they are shown', async () => {
    renderNewRule();
    expect(screen.queryByText('.catalog-archive')).not.toBeInTheDocument();

    await clickListOption('boostRuleShowHidden');
    const row = screen
      .getAllByTestId('boostRuleAvailableTarget')
      .find(({ textContent }) => textContent?.startsWith('.catalog-archive')) as HTMLElement;
    expect(within(row).getByTestId('boostHiddenBadge')).toBeInTheDocument();
    await userEvent.click(row);

    expect(screen.getByTestId('boostRulePattern')).toHaveValue('.catalog-archive');
  });
});
