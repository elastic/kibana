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
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from '../../../common/presets';
import type { BoostProfile, BoostRule, BoostState } from '../../../common/types';
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
        items?: Array<{ id: string; label: string; disableButton?: boolean }>;
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
        ...(menu?.items ?? []).map(({ id, label, disableButton }) =>
          createElement('button', { key: id, disabled: disableButton === true }, label)
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
  settings: {
    mode: 'advanced',
    simple: DEFAULT_SIMPLE_MODE_DEFAULTS,
    custom_defaults: NO_CUSTOM_DEFAULTS,
  },
  profiles: [...BUILTIN_PROFILES, catalogSearch, clicks],
  rules: [
    customRule('catalog-first', ['catalog-fall'], BUILTIN_INDICES_PROFILE_NAMES.on_demand, 5),
    customRule('catalogs', ['catalog-*'], 'catalog-search', 1),
    customRule('unused-clicks', ['nothing-*'], 'clicks', 1),
    ...createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS)),
  ],
  suspended_rules: [],
  data_sources: [
    { name: 'catalog-fall', type: 'index', size_in_bytes: 4e9, docs_count: 4000 },
    { name: 'catalog-spring', type: 'index', size_in_bytes: 2e9, docs_count: 2000 },
    { name: 'products', type: 'index', size_in_bytes: 1e9 },
    { name: 'logs-app', type: 'data_stream', size_in_bytes: 3e9, docs_count: 3000 },
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

describe('ProfileDetailsPage', () => {
  it("shows an indices profile's settings, the rules using it, and what it applies to", () => {
    renderAt('/profiles/catalog-search');

    expect(getHeader().getByRole('heading', { name: 'catalog-search' })).toBeInTheDocument();
    expect(getHeader().getByText('Indices')).toBeInTheDocument();
    expect(getHeader().queryByText('Managed')).not.toBeInTheDocument();
    expect(getHeader().getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(getHeader().getByRole('button', { name: 'Delete' })).toBeEnabled();

    const settings = screen.getByTestId('boostProfileSettings');
    expect(settings).toHaveTextContent('Min boost2');
    expect(settings).toHaveTextContent('Max boost50');
    expect(settings).toHaveTextContent('One extra copyOn');
    expect(settings).toHaveTextContent('PrewarmOn');
    expect(settings).toHaveTextContent('PinOff');

    expect(screen.getByTestId('boostProfileRules')).toHaveTextContent('catalogs');
    // A higher-ranked rule keeps catalog-fall, so the profile only applies to catalog-spring.
    const usedBy = screen.getByTestId('boostProfileUsedBy');
    expect(usedBy).toHaveTextContent('catalog-spring');
    expect(usedBy).not.toHaveTextContent('catalog-fall');
    // The table always pages, however few use the profile.
    expect(usedBy).toHaveTextContent('Rows per page: 10');
    expect(screen.getByTestId('boostProfileUsage')).toHaveTextContent('Applies to1 index');
  });

  it('only offers to duplicate an Elastic-managed profile', () => {
    renderAt(`/profiles/${BUILTIN_INDICES_PROFILE_NAMES.performant}`);

    // The same color as the badge in the profiles list, not the header's hollow default.
    expect(getHeader().getByText('Managed')).toHaveAttribute('data-color', 'default');
    expect(getHeader().getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
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
    expect(getHeader().getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    const settings = screen.getByTestId('boostRuleSettings');
    expect(within(settings).getByRole('link', { name: 'catalog-search' })).toBeInTheDocument();
    expect(settings).toHaveTextContent('Index pattern catalog-*');
    expect(settings).toHaveTextContent('Priority1');

    const usage = screen.getByTestId('boostRuleUsage');
    expect(usage).toHaveTextContent('Matches2 indices');
    expect(usage).toHaveTextContent('Applies to1 index');

    const matched = screen.getByTestId('boostRuleMatched');
    // Only a match that a higher-ranked rule applies to instead names a rule; the others have a dash.
    const springRow = within(matched).getByText('catalog-spring').closest('tr') as HTMLElement;
    expect(within(springRow).queryByTestId('boostSupersedingRule')).not.toBeInTheDocument();
    expect(within(springRow).getByTestId('boostEmptyCell')).toHaveTextContent('—');
    expect(springRow).toHaveTextContent('2,000');
    const fallRow = within(matched).getByText('catalog-fall').closest('tr') as HTMLElement;
    expect(within(fallRow).getByTestId('boostSupersedingRule')).toHaveTextContent('catalog-first');
    expect(fallRow).toHaveTextContent('4,000');
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
    // The rule that applies instead explains itself.
    await userEvent.hover(within(matched).getByRole('link', { name: 'catalog-first' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '"catalog-first" ranks higher, so it applies instead.'
    );

    await userEvent.click(within(matched).getByRole('link', { name: 'catalog-spring' }));
    expect(mockIndexManagementLocator.navigate).toHaveBeenCalledWith({
      page: 'index_details',
      indexName: 'catalog-spring',
    });
  });

  it("opens a data stream's details from Index Management in place, and counts its documents", async () => {
    mockIndexManagementLocator.navigate.mockClear();
    renderAt(`/rules/${DEFAULT_DATA_STREAMS_RULE_NAME}`);
    const matched = screen.getByTestId('boostRuleMatched');
    expect(within(matched).getByText('logs-app').closest('tr')).toHaveTextContent('3,000');

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

    await userEvent.type(matched.getByRole('searchbox', { name: 'Search indices' }), 'spring');
    expect(getNames()).toEqual(['catalog-spring']);
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
  });

  it("shows a data streams rule's data in each period of its profile", () => {
    renderAt(`/rules/${DEFAULT_DATA_STREAMS_RULE_NAME}`);

    expect(screen.getByTestId('boostAgeTimelinePeriods-recent')).toHaveTextContent('3 GB');
    expect(screen.getByTestId('boostAgeTimeline')).toHaveTextContent(
      'Data in each period across the 1 data stream this rule applies to, 3 GB in total.'
    );
  });

  it('only has a column of outranking rules when a higher-ranked rule outranks a match', () => {
    const { unmount } = renderAt('/rules/catalogs');
    expect(
      within(screen.getByTestId('boostRuleMatched')).getByRole('columnheader', {
        name: 'Outranked by rule',
      })
    ).toBeInTheDocument();
    unmount();

    // catalog-first matches only catalog-fall, which nothing outranks.
    renderAt('/rules/catalog-first');
    expect(
      within(screen.getByTestId('boostRuleMatched')).queryByRole('columnheader', {
        name: 'Outranked by rule',
      })
    ).not.toBeInTheDocument();
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
