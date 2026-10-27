/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_INDICES_RULE_NAME,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostProfile, BoostRule, BoostState } from '../../../common/types';
import { estimateDataSourceVcuRange } from '../../../common/vcu_estimate';
import { setShowsEstimates } from '../../prototype/estimates_setting';
import { formatCost, roundVcus } from '../cost_format';
import { ProfileDetailsPage } from '../profiles/profile_details_page';
import { RuleDetailsPage } from '../rules/rule_details_page';

// The page header lives in Kibana's chrome, so a stand-in shows its title, badges, and actions.
jest.mock('@kbn/app-header', () => {
  const { createElement } = jest.requireActual('react');
  return {
    AppHeader: ({
      title,
      badges = [],
      menu,
    }: {
      title: string;
      badges?: Array<{ label: string; color?: string }>;
      menu?: {
        primaryActionItem?: { label: string };
        items?: Array<{ id: string; label: string; disableButton?: boolean; overflow?: boolean }>;
      };
    }) =>
      createElement(
        'div',
        { 'data-test-subj': 'mockAppHeader' },
        createElement('h1', null, title),
        ...badges.map(({ label, color = 'hollow' }) =>
          createElement('span', { key: label, 'data-color': color }, label)
        ),
        menu?.primaryActionItem &&
          createElement('button', { key: 'primary' }, menu.primaryActionItem.label),
        // Items in the overflow menu are marked, as they're out of view until it opens.
        ...(menu?.items ?? []).map(({ id, label, disableButton, overflow }) =>
          createElement(
            'button',
            { key: id, disabled: disableButton === true, 'data-overflow': overflow === true },
            label
          )
        )
      ),
    AppHeaderLoading: () => null,
  };
});

const mockCapabilities = { boost: { save: true } };

// Index Management's locator, which links indices and data streams to their details.
const mockIndexManagementLocator = {
  getUrl: async (params: { page: string; indexName?: string; dataStreamName?: string }) =>
    params.page === 'index_details'
      ? `/app/management/data/index_management/indices/index_details?indexName=${params.indexName}`
      : `/app/management/data/index_management/data_streams/${params.dataStreamName}`,
  navigate: jest.fn(),
};

// Index Management's data stream details flyout, which closes asking to reload after a change.
const MockDataStreamFlyout = ({
  datastreamName,
  onClose,
}: {
  datastreamName: string;
  onClose: (shouldReload?: boolean) => void;
}) => {
  const { createElement } = jest.requireActual('react');
  return createElement(
    'div',
    { 'data-test-subj': 'mockDataStreamFlyout' },
    datastreamName,
    createElement('button', { onClick: () => onClose(true) }, 'Delete and close')
  );
};
const mockRefetchBoostState = jest.fn();

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({
    application: { capabilities: mockCapabilities },
    share: { url: { locators: { get: () => mockIndexManagementLocator } } },
    indexManagement: { getDatastreamFlyoutComponent: () => MockDataStreamFlyout },
    appParams: { setBreadcrumbs: jest.fn(), history: {} },
    chrome: { docTitle: { change: jest.fn() } },
    notifications: { toasts: { addSuccess: jest.fn() } },
  }),
}));

const catalogSearch: BoostProfile = {
  name: 'catalog-search',
  type: 'indices',
  is_builtin: false,
  min_boost: 2,
  max_boost: 50,
  high_availability: 'one_extra_copy',
  prewarm: true,
  pinned: false,
};

const clicks: BoostProfile = {
  name: 'clicks',
  type: 'data_streams',
  is_builtin: false,
  recent: { min_boost: 2, max_boost: 100, max_age: '1d' },
  standard: { min_boost: 1, max_boost: 10, max_age: '7d' },
  background: { min_boost: 0, max_boost: 1 },
};

const customRule = (
  name: string,
  patterns: string[],
  profileName: string,
  priority: number
): BoostRule => ({
  name,
  index_patterns: patterns,
  boost_profile: profileName,
  priority,
  is_builtin: false,
});

const mockState: BoostState = {
  settings: { default_profiles: DEFAULT_RULE_PROFILES },
  profiles: [...BUILTIN_PROFILES, catalogSearch, clicks],
  rules: [
    customRule('catalog-first', ['catalog-fall'], BUILTIN_INDICES_PROFILE_NAMES.on_demand, 5),
    customRule('catalogs', ['catalog-*'], 'catalog-search', 1),
    customRule('unused-clicks', ['nothing-*'], 'clicks', 1),
    ...createDefaultRules(DEFAULT_RULE_PROFILES),
  ],
  data_sources: [
    { name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 },
    { name: 'catalog-spring', type: 'index', size_in_bytes: 2e9 },
    { name: 'products', type: 'index', size_in_bytes: 1e9 },
    // Only the default rule matches it.
    { name: '.catalog-archive', type: 'index', size_in_bytes: 1e9, hidden: true },
    {
      name: 'logs-app',
      type: 'data_stream',
      size_in_bytes: 3e9,
      lifecycle: { enabled: true, data_retention: '7d' },
    },
  ],
};

jest.mock('../../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: mockState }),
  useRefetchBoostState: () => mockRefetchBoostState,
  useCreateRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useUpdateRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useUpdateDefaultRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useDeleteRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useCreateProfile: () => ({ mutate: jest.fn(), isLoading: false }),
  useUpdateProfile: () => ({ mutate: jest.fn(), isLoading: false }),
  useDeleteProfile: () => ({ mutate: jest.fn(), isLoading: false }),
}));

const renderAt = (path: string) =>
  render(
    <IntlProvider locale="en">
      <MemoryRouter initialEntries={[path]}>
        <Route path="/rules/:ruleName" component={RuleDetailsPage} />
        <Route path="/profiles/:profileName" component={ProfileDetailsPage} />
      </MemoryRouter>
    </IntlProvider>
  );

const getHeader = () => within(screen.getByTestId('mockAppHeader'));

// Each tester's estimates setting stays in their browser, so it's turned back off after each test.
afterEach(() => setShowsEstimates(false));

describe('ProfileDetailsPage', () => {
  it("shows an indices profile's settings, the rules using it, and what it applies to", () => {
    renderAt('/profiles/catalog-search');

    expect(getHeader().getByRole('heading', { name: 'catalog-search' })).toBeInTheDocument();
    expect(getHeader().getByText('Indices')).toBeInTheDocument();
    expect(getHeader().queryByText('Managed')).not.toBeInTheDocument();
    expect(getHeader().getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(getHeader().getByRole('button', { name: 'Duplicate' })).toHaveAttribute(
      'data-overflow',
      'true'
    );
    expect(getHeader().getByRole('button', { name: 'Delete' })).toBeEnabled();

    const settings = screen.getByTestId('boostProfileSettings');
    expect(settings).toHaveTextContent('Boost2–50');
    expect(settings).toHaveTextContent('One extra copyOn');
    expect(settings).toHaveTextContent('PrewarmOn');
    expect(settings).toHaveTextContent('PinnedOff');

    expect(screen.getByTestId('boostProfileRules')).toHaveTextContent('catalogs');
    // Each rule shows where it applies the profile, not everything it matches.
    expect(screen.getByTestId('boostProfileRules')).toHaveTextContent('Applies to');
    expect(screen.getByTestId('boostProfileRules')).not.toHaveTextContent('Matches');
    expect(screen.getByTestId('boostProfileRules')).toHaveTextContent('Rows per page: 10');
    // A higher-ranked rule keeps catalog-fall, so the profile only applies to catalog-spring. The
    // rules list what they apply it to on their own pages, so this page doesn't list them too.
    const profileRules = within(screen.getByTestId('boostProfileRules'));
    expect(profileRules.getByTestId('boostRuleMatches')).toHaveTextContent('1 index');
    // The same table as the rules tab, with each rule's actions, but not its profile, which is
    // this one.
    expect(profileRules.getByTestId('editBoostRule')).toBeInTheDocument();
    expect(profileRules.queryByText('Profile name')).not.toBeInTheDocument();
    // It's searched like the rules tab, beside the same button to create a rule.
    expect(profileRules.getByPlaceholderText('Search boost rules')).toBeInTheDocument();
    expect(profileRules.getByTestId('boostProfileDetailsCreateRule')).toHaveTextContent(
      'Create boost rule'
    );
    expect(screen.queryByTestId('boostProfileUsedBy')).not.toBeInTheDocument();
    expect(screen.getByTestId('boostProfileUsage')).toHaveTextContent('Rules using1');
    expect(screen.getByTestId('boostProfileUsage')).toHaveTextContent('Applies to1 index');
    // Its storage is shown as a size alone, not as a share of the project's.
    expect(screen.getByTestId('boostProfileUsage')).toHaveTextContent(/Storage size[\d.]+ GB/);
    expect(screen.getByTestId('boostProfileUsage')).not.toHaveTextContent(/GB\d+% of project/);
  });

  it('searches the rules using a profile by name', async () => {
    renderAt('/profiles/catalog-search');
    const profileRules = within(screen.getByTestId('boostProfileRules'));

    expect(profileRules.getByTestId('boostRulesCount')).toHaveTextContent(
      'Showing 1 of 1 boost rule'
    );
    await userEvent.type(profileRules.getByTestId('boostProfileRulesSearch'), 'nothing');
    expect(profileRules.queryByText('catalogs')).not.toBeInTheDocument();
    expect(profileRules.getByTestId('boostRulesCount')).toHaveTextContent(
      'Showing 0 of 0 boost rules'
    );

    await userEvent.clear(profileRules.getByTestId('boostProfileRulesSearch'));
    await userEvent.type(profileRules.getByTestId('boostProfileRulesSearch'), 'CATA');
    expect(profileRules.getByText('catalogs')).toBeInTheDocument();
  });

  it('only offers to duplicate an Elastic-managed profile', () => {
    renderAt(`/profiles/${BUILTIN_INDICES_PROFILE_NAMES.performant}`);

    // The same color as the badge in the profiles list, not the header's hollow default.
    expect(getHeader().getByText('Managed')).toHaveAttribute('data-color', 'default');
    // Copying waits in the menu, as it does for other profiles.
    expect(getHeader().getByRole('button', { name: 'Duplicate' })).toHaveAttribute(
      'data-overflow',
      'true'
    );
    expect(getHeader().queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
    expect(getHeader().queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it("shows a data stream profile's periods and age timeline, without index options", () => {
    renderAt(`/profiles/${BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days}`);

    const periods = screen.getByTestId('boostProfilePeriods');
    expect(periods).toHaveTextContent('Recent');
    expect(periods).toHaveTextContent('Background');
    expect(screen.getByTestId('boostProfileSettings')).not.toHaveTextContent('Prewarm');
    expect(screen.getByTestId('boostProfileSettings')).not.toHaveTextContent('One extra copy');
    // The default rule applies it to logs-app, all of whose data counts as recent.
    expect(screen.getByTestId('boostAgeTimelinePeriods-recent')).toHaveTextContent('3 GB');
  });

  it('marks a standard phase that ends where the recent one does as skipped', () => {
    renderAt(`/profiles/${BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_1_day}`);

    expect(screen.getByTestId('boostProfilePhase-recent')).toHaveTextContent(
      'Data up to 1 day old'
    );
    // Like the others, it shows its boost, with what data it holds, which is none.
    expect(screen.getByTestId('boostProfilePhase-standard')).toHaveTextContent('boostSkipped');
    // Background data starts where recent data ends.
    expect(screen.getByTestId('boostProfilePhase-background')).toHaveTextContent(
      'Data older than 1 day'
    );
  });

  it("shows each phase's boost and the ages of its data", () => {
    renderAt('/profiles/clicks');

    expect(screen.getByTestId('boostProfilePhase-recent')).toHaveTextContent('2–100');
    expect(screen.getByTestId('boostProfilePhase-standard')).toHaveTextContent('1 day–7 days');
    expect(screen.getByTestId('boostProfilePhase-standard')).not.toHaveTextContent('Skipped');
    expect(screen.getByTestId('boostProfilePhase-background')).toHaveTextContent(
      'Data older than 7 days'
    );
    // Its only rule matches nothing, so it applies the profile nowhere.
    expect(screen.getByTestId('boostProfileRules')).toHaveTextContent('0 data streams');
  });

  it('offers to create a rule with a profile no rule uses', async () => {
    renderAt(`/profiles/${BUILTIN_INDICES_PROFILE_NAMES.high_availability}`);

    // Under the same title as the rules it would list.
    expect(
      within(screen.getByTestId('boostProfileUnused')).getByRole('heading', {
        name: 'Boost rules using this profile',
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId('boostProfileUnused')).toHaveTextContent("This profile isn't in use");
    expect(screen.queryByTestId('boostProfileRules')).not.toBeInTheDocument();
    expect(screen.queryByTestId('boostProfileUsedBy')).not.toBeInTheDocument();
    expect(screen.getByTestId('boostProfileDetailsCreateRule')).toHaveTextContent(
      'Create boost rule'
    );
  });

  it('leaves the timeline without sizes until the profile applies to a data stream', () => {
    renderAt('/profiles/clicks');

    expect(screen.getByTestId('boostAgeTimelinePeriods-recent')).toHaveTextContent('—');
    expect(screen.getByTestId('boostAgeTimeline')).toHaveTextContent(
      'appears once a boost rule applies this profile to a data stream'
    );
  });

  it("says when a profile doesn't exist", () => {
    renderAt('/profiles/missing');

    expect(screen.getByTestId('boostDetailsNotFound')).toHaveTextContent('Boost profile not found');
  });
});

describe('RuleDetailsPage', () => {
  it("shows a rule's settings, and what it matches with the rule each one uses", () => {
    renderAt('/rules/catalogs');

    expect(getHeader().getByRole('heading', { name: 'catalogs' })).toBeInTheDocument();
    expect(getHeader().getByRole('button', { name: 'Edit rule' })).toBeInTheDocument();
    // Duplicate and Delete wait in the overflow menu.
    expect(getHeader().getByRole('button', { name: 'Duplicate' })).toHaveAttribute(
      'data-overflow',
      'true'
    );
    expect(getHeader().getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'data-overflow',
      'true'
    );

    const settings = screen.getByTestId('boostRuleSettings');
    expect(within(settings).getByRole('link', { name: 'catalog-search' })).toBeInTheDocument();
    expect(settings).toHaveTextContent('Index pattern catalog-*');
    expect(settings).toHaveTextContent('Priority1');

    const usage = screen.getByTestId('boostRuleUsage');
    expect(usage).toHaveTextContent('Matches2 indices');
    expect(usage).toHaveTextContent('Applies to1 index');
    // Its storage is shown as a size alone, not as a share of the project's.
    expect(usage).toHaveTextContent(/Storage size[\d.]+ GB/);
    expect(usage).not.toHaveTextContent(/GB\d+% of project/);
    // Search cost only shows once a tester turns on the prototype's estimates.
    expect(usage).not.toHaveTextContent('Search cost per hour');

    const matched = screen.getByTestId('boostRuleMatched');
    expect(within(matched).getByRole('heading', { name: 'Matching indices' })).toBeInTheDocument();
    // Only a match that a higher-ranked rule applies to instead names a rule; the others have a dash.
    const springRow = within(matched).getByText('catalog-spring').closest('tr') as HTMLElement;
    expect(within(springRow).queryByTestId('boostSupersedingRule')).not.toBeInTheDocument();
    expect(within(springRow).getByTestId('boostEmptyCell')).toHaveTextContent('—');
    expect(springRow).toHaveTextContent('2 GB');
    const fallRow = within(matched).getByText('catalog-fall').closest('tr') as HTMLElement;
    expect(within(fallRow).getByTestId('boostSupersedingRule')).toHaveTextContent('catalog-first');
    expect(fallRow).toHaveTextContent('4 GB');
    // The table always pages, however few it matches.
    expect(matched).toHaveTextContent('Rows per page: 10');
  });

  it('links matches to their details in Index Management, striking through outranked ones', async () => {
    renderAt('/rules/catalogs');
    const matched = screen.getByTestId('boostRuleMatched');

    expect(await within(matched).findByRole('link', { name: 'catalog-spring' })).toHaveAttribute(
      'href',
      '/app/management/data/index_management/indices/index_details?indexName=catalog-spring'
    );
    // A higher-ranked rule applies to catalog-fall instead, so its name is struck through.
    expect(within(matched).getByTestId('boostSupersededTarget')).toHaveTextContent('catalog-fall');
    expect(within(matched).getByRole('link', { name: 'catalog-fall' })).toBeInTheDocument();
    // The column of rules that apply instead explains them once, from an icon in its header, which
    // stays out of the tab order, since the header's sort button takes the focus.
    const header = within(matched).getByRole('columnheader', { name: /^Outranked by rule/ });
    const icon = header.querySelector('[data-euiicon-type="info"]') as Element;
    expect(icon).not.toHaveAttribute('tabindex');
    await userEvent.hover(icon);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'A higher-ranked rule that applies to the match instead.'
    );

    await userEvent.click(within(matched).getByRole('link', { name: 'catalog-spring' }));
    expect(mockIndexManagementLocator.navigate).toHaveBeenCalledWith({
      page: 'index_details',
      indexName: 'catalog-spring',
    });
  });

  it("opens a data stream's details from Index Management in place", async () => {
    mockIndexManagementLocator.navigate.mockClear();
    renderAt(`/rules/${DEFAULT_DATA_STREAMS_RULE_NAME}`);
    const matched = screen.getByTestId('boostRuleMatched');
    expect(within(matched).getByText('logs-app').closest('tr')).toHaveTextContent('3 GB');

    // The link still leads to Index Management, such as to open it in a new tab.
    const link = await within(matched).findByRole('link', { name: 'logs-app' });
    expect(link).toHaveAttribute(
      'href',
      '/app/management/data/index_management/data_streams/logs-app'
    );
    await userEvent.click(link);
    expect(screen.getByTestId('mockDataStreamFlyout')).toHaveTextContent('logs-app');
    expect(mockIndexManagementLocator.navigate).not.toHaveBeenCalled();

    // A change in the flyout, such as deleting the data stream, reloads what the page shows.
    await userEvent.click(screen.getByRole('button', { name: 'Delete and close' }));
    expect(screen.queryByTestId('mockDataStreamFlyout')).not.toBeInTheDocument();
    expect(mockRefetchBoostState).toHaveBeenCalled();
  });

  it('filters matches by name, and by whether the rule applies to them', async () => {
    renderAt('/rules/catalogs');
    const matched = within(screen.getByTestId('boostRuleMatched'));
    const getNames = () =>
      matched
        .getAllByRole('row')
        .slice(1)
        .map(
          (row) => row.querySelector('[data-test-subj="boostIndexManagementLink"]')?.textContent
        );

    expect(matched.getByTestId('boostMatchedCount')).toHaveTextContent('Showing 1–2 of 2 indices');
    await userEvent.type(matched.getByRole('searchbox', { name: 'Search indices' }), 'spring');
    expect(getNames()).toEqual(['catalog-spring']);
    // The count says which of the matches the search leaves the page shows.
    expect(matched.getByTestId('boostMatchedCount')).toHaveTextContent('Showing 1 of 1 index');
    // The filters count what they'd show with the search.
    expect(matched.getByTestId('boostMatchedFilter-applied')).toHaveTextContent('1');
    expect(matched.getByTestId('boostMatchedFilter-outranked')).toHaveTextContent('0');
    expect(matched.getByTestId('boostMatchedFilter-outranked')).toBeDisabled();

    await userEvent.clear(matched.getByRole('searchbox', { name: 'Search indices' }));
    await userEvent.click(matched.getByTestId('boostMatchedFilter-outranked'));
    expect(getNames()).toEqual(['catalog-fall']);

    await userEvent.click(matched.getByTestId('boostMatchedFilter-applied'));
    expect(getNames()).toEqual(['catalog-spring']);

    // Turning the filter off again shows both.
    await userEvent.click(matched.getByTestId('boostMatchedFilter-applied'));
    expect(getNames()).toEqual(['catalog-fall', 'catalog-spring']);

    await userEvent.type(matched.getByRole('searchbox', { name: 'Search indices' }), 'products');
    expect(matched.getByText('No indices match your search or filter.')).toBeInTheDocument();
    // Nothing the rule matches is hidden, so there's nothing to show.
    expect(matched.getByTestId('boostMatchedShowHidden')).toBeDisabled();
  });

  it('leaves hidden matches out until they are shown, counting them', async () => {
    renderAt(`/rules/${DEFAULT_INDICES_RULE_NAME}`);
    const matched = within(screen.getByTestId('boostRuleMatched'));

    // The rule applies to the hidden index all the same.
    expect(screen.getByTestId('boostRuleUsage')).toHaveTextContent('Applies to2 indices');
    expect(matched.queryByText('.catalog-archive')).not.toBeInTheDocument();
    expect(matched.getByTestId('boostMatchedCount')).toHaveTextContent('Showing 1–3 of 3 indices');
    expect(matched.getByTestId('boostMatchedShowHidden')).toHaveTextContent('Show hidden1');

    await userEvent.click(matched.getByTestId('boostMatchedShowHidden'));

    const row = matched.getByText('.catalog-archive').closest('tr') as HTMLElement;
    expect(within(row).getByTestId('boostHiddenBadge')).toHaveTextContent('Hidden');
    expect(matched.getByTestId('boostMatchedCount')).toHaveTextContent('Showing 1–4 of 4 indices');
  });

  it('says when only hidden matches are left by the search', async () => {
    renderAt(`/rules/${DEFAULT_INDICES_RULE_NAME}`);
    const matched = within(screen.getByTestId('boostRuleMatched'));

    await userEvent.type(matched.getByRole('searchbox', { name: 'Search indices' }), 'archive');

    expect(
      matched.getByText('Only hidden indices match. Show hidden to see them.')
    ).toBeInTheDocument();
  });

  it("shows a data streams rule's data in each phase of its profile", () => {
    renderAt(`/rules/${DEFAULT_DATA_STREAMS_RULE_NAME}`);

    expect(screen.getByRole('heading', { name: 'Boost phase timeline' })).toBeInTheDocument();
    expect(screen.getByTestId('boostAgeTimelinePeriods-recent')).toHaveTextContent('3 GB');
    // The periods say how much data is in each, so there's no caption.
    expect(screen.getByTestId('boostAgeTimeline')).not.toHaveTextContent('appears once');
  });

  it('only has a column of outranking rules when a higher-ranked rule outranks a match', () => {
    const { unmount } = renderAt('/rules/catalogs');
    expect(
      within(screen.getByTestId('boostRuleMatched')).getByRole('columnheader', {
        name: /^Outranked by rule/,
      })
    ).toBeInTheDocument();
    unmount();

    // catalog-first matches only catalog-fall, which nothing outranks.
    renderAt('/rules/catalog-first');
    expect(
      within(screen.getByTestId('boostRuleMatched')).queryByRole('columnheader', {
        name: /^Outranked by rule/,
      })
    ).not.toBeInTheDocument();
  });

  it('estimates the search cost of each match the rule applies to, at rest and at peak', () => {
    setShowsEstimates(true);
    renderAt('/rules/catalogs');

    // The rule's search cost at rest and at peak are each shown as a share of the project's.
    expect(screen.getByTestId('boostRuleRestCostShare')).toHaveTextContent(
      /at rest<?\d+% of project/
    );
    expect(screen.getByTestId('boostRulePeakCostShare')).toHaveTextContent(
      /at peak<?\d+% of project/
    );
    const matched = screen.getByTestId('boostRuleMatched');
    const [spring] = mockState.data_sources.filter(({ name }) => name === 'catalog-spring');
    const { atRest, atPeak } = estimateDataSourceVcuRange(spring, catalogSearch);

    const springRow = within(matched).getByText('catalog-spring').closest('tr');
    expect(springRow).toHaveTextContent(formatCost(roundVcus(atRest)));
    expect(springRow).toHaveTextContent(formatCost(roundVcus(atPeak)));
    // catalog-first applies to catalog-fall instead, so it costs this rule nothing.
    const fallRow = within(matched).getByText('catalog-fall').closest('tr') as HTMLElement;
    expect(within(fallRow).getAllByTestId('boostEmptyCell')).toHaveLength(2);
    expect(fallRow).not.toHaveTextContent('$');
  });

  it("shows a data stream's retention, which indices don't have", () => {
    const { unmount } = renderAt(`/rules/${DEFAULT_DATA_STREAMS_RULE_NAME}`);
    const matched = screen.getByTestId('boostRuleMatched');
    expect(
      within(matched).getByRole('columnheader', { name: /^Data retention/ })
    ).toBeInTheDocument();
    expect(within(matched).getByText('logs-app').closest('tr')).toHaveTextContent('7 days');
    unmount();

    renderAt('/rules/catalogs');
    expect(
      within(screen.getByTestId('boostRuleMatched')).queryByRole('columnheader', {
        name: /^Data retention/,
      })
    ).not.toBeInTheDocument();
  });

  it('sorts matches by the rule that outranks them, with the rest last either way', async () => {
    // The default rule matches every index: catalog-first and catalogs outrank it for the catalogs.
    renderAt(`/rules/${DEFAULT_INDICES_RULE_NAME}`);
    const matched = within(screen.getByTestId('boostRuleMatched'));
    const getNames = () =>
      matched
        .getAllByRole('row')
        .slice(1)
        .map(
          (row) => row.querySelector('[data-test-subj="boostIndexManagementLink"]')?.textContent
        );
    const sortButton = () => matched.getByRole('button', { name: /Outranked by rule/ });

    await userEvent.click(sortButton());
    expect(getNames()).toEqual(['catalog-fall', 'catalog-spring', 'products']);
    await userEvent.click(sortButton());
    expect(getNames()).toEqual(['catalog-spring', 'catalog-fall', 'products']);

    // The sort holds as the table re-renders, such as while searching.
    await userEvent.type(matched.getByRole('searchbox', { name: 'Search indices' }), 'catalog');
    expect(getNames()).toEqual(['catalog-spring', 'catalog-fall']);
  });

  it('has no age timeline for an indices rule', () => {
    renderAt('/rules/catalogs');

    expect(screen.queryByTestId('boostAgeTimeline')).not.toBeInTheDocument();
  });

  it('only offers to edit a default rule', () => {
    renderAt(`/rules/${DEFAULT_INDICES_RULE_NAME}`);

    // The same color as the badge in the rules list, not the header's hollow default.
    expect(getHeader().getByText('Default')).toHaveAttribute('data-color', 'default');
    expect(screen.getByTestId('boostRuleSettings')).toHaveTextContent('All unmatched indices');
    expect(getHeader().getByRole('button', { name: 'Edit rule' })).toBeInTheDocument();
    expect(getHeader().queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument();
    expect(getHeader().queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it("says when a rule doesn't exist", () => {
    renderAt('/rules/missing');

    expect(screen.getByTestId('boostDetailsNotFound')).toHaveTextContent('Boost rule not found');
  });
});
