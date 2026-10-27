/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type {
  DataStreamDetail,
  Index,
  IndexDetailsTab,
  IndexManagementPluginStart,
  IndexOverviewCard,
} from '@kbn/index-management-shared-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { BOOST_EXPLAIN_API_PATH, BOOST_STATE_API_PATH } from '../common/constants';
import { BUILTIN_PROFILES, DEFAULT_RULE_PROFILES, createDefaultRules } from '../common/presets';
import { getMatchingRules } from '../common/resolution';
import type { BoostProfile, BoostRule, BoostState } from '../common/types';
import { registerIndexManagementExtensions } from './index_management_extensions';

const storefrontSearch: BoostProfile = {
  name: 'storefront-search',
  type: 'indices',
  is_builtin: false,
  min_boost: 2,
  max_boost: 10_000,
  high_availability: 'one_extra_copy',
  prewarm: true,
  pinned: false,
};

const storefrontCore: BoostRule = {
  name: 'storefront-core',
  index_patterns: ['products'],
  boost_profile: 'storefront-search',
  priority: 10,
  is_builtin: false,
};

const state: BoostState = {
  settings: { default_profiles: DEFAULT_RULE_PROFILES },
  profiles: [...BUILTIN_PROFILES, storefrontSearch],
  rules: [storefrontCore, ...createDefaultRules(DEFAULT_RULE_PROFILES)],
  data_sources: [
    { name: 'products', type: 'index', size_in_bytes: 4e9 },
    { name: 'users', type: 'index', size_in_bytes: 1e9 },
    {
      name: 'logs-app',
      type: 'data_stream',
      size_in_bytes: 3e9,
      data_ages: [
        { age_hours: 2, size_in_bytes: 1e9 },
        { age_hours: 24 * 30, size_in_bytes: 2e9 },
      ],
    },
    {
      name: '.alert-actions',
      type: 'data_stream',
      size_in_bytes: 1e6,
      hidden: true,
      data_ages: [{ age_hours: 2, size_in_bytes: 1e6 }],
    },
  ],
};

const indexManagementLocator = {
  getUrl: async () => '/app/management/data/index_management',
  getRedirectUrl: () => '',
  navigate: jest.fn(),
};

const setup = ({ canEdit = true } = {}) => {
  const core = coreMock.createStart();
  core.http.get.mockImplementation((async (path: string) => {
    if (path === BOOST_STATE_API_PATH) {
      return state;
    }
    const name = decodeURIComponent(path.slice(BOOST_EXPLAIN_API_PATH.length + 1));
    if (name === 'missing') {
      throw new Error('Not found');
    }
    // As the server explains it, a backing index by its data stream.
    const target = name.startsWith('.ds-logs-app')
      ? { name: 'logs-app', type: 'data_stream' as const }
      : { name, type: name.startsWith('logs-') ? ('data_stream' as const) : ('index' as const) };
    const profilesByName = new Map(state.profiles.map((profile) => [profile.name, profile]));
    const matches = getMatchingRules(target, state.rules, profilesByName);
    return { boost_profile: matches[0]?.boost_profile, matches };
  }) as typeof core.http.get);
  core.application.getUrlForApp.mockImplementation(
    (appId, { path } = {}) => `/app/${appId}${path ?? ''}`
  );
  core.application.capabilities = {
    ...core.application.capabilities,
    boost: { show: true, save: canEdit },
  };

  const cards: IndexOverviewCard[] = [];
  const tabs: IndexDetailsTab[] = [];
  const details: DataStreamDetail[] = [];
  registerIndexManagementExtensions(core, {
    share: {
      url: { locators: { get: () => indexManagementLocator } },
    } as unknown as SharePluginStart,
    indexManagement: {
      extensionsService: {
        addIndexOverviewCard: (card: IndexOverviewCard) => cards.push(card),
        addIndexDetailsTab: (tab: IndexDetailsTab) => tabs.push(tab),
        addDataStreamDetail: (detail: DataStreamDetail) => details.push(detail),
      },
    } as unknown as IndexManagementPluginStart,
  });
  return { core, card: cards[0], tab: tabs[0], details };
};

const renderInIntl = (children: ReactNode) =>
  render(<IntlProvider locale="en">{children}</IntlProvider>);

const renderCard = ({ renderCard: renderCardParts }: IndexOverviewCard, name: string) => {
  const { content, footer } = renderCardParts({
    index: { name } as Index,
    getUrlForApp: jest.fn(),
  });
  return renderInIntl(
    <>
      <div data-test-subj="content">{content.left}</div>
      <div data-test-subj="actions">{content.right}</div>
      <div data-test-subj="footer">{footer?.left}</div>
    </>
  );
};

const renderTab = ({ renderTabContent }: IndexDetailsTab, index: Index) =>
  renderInIntl(
    renderTabContent({ index, getUrlForApp: jest.fn(), euiTheme: {} as never }) as ReactNode
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Index Management extensions', () => {
  it('adds a card, a tab after the overview, and two data stream details, except for system indices', () => {
    const { card, tab, details } = setup();

    expect(card.title).toBe('Search boost');
    expect([tab.id, tab.name, tab.order]).toEqual(['boost', 'Search boost', 15]);
    // The tab's dividers meet the tabs' own, as on the boost app's details pages.
    expect(tab.hasTopSpacing).toBe(false);
    expect(details.map(({ name }) => name)).toEqual(['Boost profile', 'Boost rule']);
    // The boost server marks system indices, which Elasticsearch doesn't boost.
    expect(card.shouldRenderCard?.({ index: { name: '.kibana_1', isBoostable: false } })).toBe(
      false
    );
    expect(tab.shouldRenderTab?.({ index: { name: '.kibana_1', isBoostable: false } })).toBe(false);
    expect(card.shouldRenderCard?.({ index: { name: 'products', isBoostable: true } })).toBe(true);
    // Without the mark, such as when the server couldn't tell, both show.
    expect(tab.shouldRenderTab?.({ index: { name: 'products' } })).toBe(true);
  });

  describe('overview card', () => {
    it('shows the rule that applies, beside the button that edits it, and the profile it applies', async () => {
      const { core, card } = setup();

      renderCard(card, 'products');

      expect(await screen.findByTestId('boostIndexCardRule')).toHaveTextContent('storefront-core');
      const profile = within(screen.getByTestId('footer')).getByTestId('boostExplanationProfile');
      expect(profile).toHaveTextContent('storefront-search');
      expect(profile).toHaveAttribute(
        'href',
        '/app/management/data/boost/profiles/storefront-search'
      );
      // Every part comes from one request.
      expect(core.http.get).toHaveBeenCalledTimes(1);

      const editRule = within(screen.getByTestId('actions')).getByTestId('boostIndexCardEditRule');
      expect(editRule).toHaveTextContent('Edit rule');
      await userEvent.click(editRule);
      expect(await screen.findByTestId('boostRulePriority')).toHaveValue(10);
    });

    it('edits a default rule as its project default, as the boost app does', async () => {
      const { card } = setup();

      renderCard(card, 'users');

      await userEvent.click(await screen.findByTestId('boostIndexCardEditRule'));
      expect(await screen.findByTestId('boostProjectDefaultSave')).toBeInTheDocument();
    });

    it("doesn't offer to edit the rule without the privilege to", async () => {
      const { card } = setup({ canEdit: false });

      renderCard(card, 'users');

      expect(await screen.findByTestId('boostIndexCardRule')).toHaveTextContent('_default-indices');
      expect(screen.queryByTestId('boostIndexCardEditRule')).not.toBeInTheDocument();
    });

    it("says when boost can't load, with a button to retry", async () => {
      const { card } = setup();

      renderCard(card, 'missing');

      expect(await screen.findByTestId('boostExplanationError')).toHaveTextContent(
        'Unable to load search boost'
      );
      expect(screen.getByTestId('boostIndexCardReload')).toHaveTextContent('Reload');
    });
  });

  describe('Search boost tab', () => {
    it("shows an index's rule, and its profile's settings, each with its own edit", async () => {
      const { tab } = setup();

      renderTab(tab, { name: 'products' });

      const rule = await screen.findByTestId('boostIndexTabRule');
      expect(within(rule).getByTestId('boostExplanationRule')).toHaveTextContent('storefront-core');
      expect(rule).toHaveTextContent('TargetsSelected 1 index');
      expect(rule).toHaveTextContent('Priority10');

      // Both rules that match, in the order they rank, the first marked as the one that applies.
      const matchingRows = within(screen.getByTestId('boostIndexTabMatchingRules'))
        .getAllByRole('row')
        .slice(1);
      expect(matchingRows.map((row) => row.textContent)).toEqual([
        expect.stringMatching(
          /^1.*storefront-coreApplied.*storefront-search.*10.*Selected 1 index$/
        ),
        expect.stringMatching(
          /^2.*_default-indicesDefault.*_performantManaged.*-1.*All unmatched indices$/
        ),
      ]);
      const profile = screen.getByTestId('boostIndexTabProfile');
      expect(within(profile).getByTestId('boostExplanationProfile')).toHaveAttribute(
        'href',
        '/app/management/data/boost/profiles/storefront-search'
      );
      expect(profile).toHaveTextContent('Boost2–10,000');
      expect(profile).toHaveTextContent('One extra copyOn');
      expect(profile).toHaveTextContent('PrewarmOn');
      expect(profile).toHaveTextContent('PinnedOff');

      await userEvent.click(within(profile).getByTestId('boostIndexTabEditProfile'));
      expect(await screen.findByTestId('boostProfileFlyout')).toBeInTheDocument();
    });

    it("shows a backing index's data stream boost, by phase and on a timeline", async () => {
      const { tab } = setup();

      renderTab(tab, { name: '.ds-logs-app-000001', data_stream: 'logs-app' });

      const rule = await screen.findByTestId('boostIndexTabRule');
      expect(rule).toHaveTextContent('_default-data-streams');
      expect(rule).toHaveTextContent('TargetsAll unmatched data streams');
      expect(rule).toHaveTextContent('Priority-1');
      expect(rule).toHaveTextContent('Data streamlogs-app');
      const profile = screen.getByTestId('boostIndexTabProfile');
      expect(profile).toHaveTextContent('_last-7-days');
      expect(within(profile).getByTestId('boostProfilePeriods')).toHaveTextContent('Recent');
      expect(screen.getByTestId('boostAgeTimeline')).toBeInTheDocument();
      // Only the default rule matches, which the rule section already shows.
      expect(screen.queryByTestId('boostIndexTabMatchingRules')).not.toBeInTheDocument();
      // Elastic manages the profile, so only the rule can change.
      expect(screen.queryByTestId('boostIndexTabEditProfile')).not.toBeInTheDocument();
      expect(screen.getByTestId('boostIndexTabEditRule')).toBeInTheDocument();
    });

    it("shows a hidden data stream's timeline, as rules apply to it all the same", async () => {
      const { tab } = setup();

      renderTab(tab, { name: '.ds-.alert-actions-000001', data_stream: '.alert-actions' });

      expect(await screen.findByTestId('boostIndexTabRule')).toHaveTextContent(
        'Data stream.alert-actions'
      );
      expect(screen.getByTestId('boostAgeTimeline')).toBeInTheDocument();
    });
  });

  it("adds a data stream's profile and rule to its details, marking built-in ones", async () => {
    const { details } = setup();

    renderInIntl(
      details.map(({ id, renderContent }) => (
        <div key={id} data-test-subj={id}>
          {renderContent({ dataStreamName: 'logs-app', getUrlForApp: jest.fn() })}
        </div>
      ))
    );

    const profile = within(screen.getByTestId('boostProfile'));
    expect(await profile.findByTestId('boostExplanationProfile')).toHaveAttribute(
      'href',
      '/app/management/data/boost/profiles/_last-7-days'
    );
    expect(screen.getByTestId('boostProfile')).toHaveTextContent('_last-7-daysManaged');
    expect(screen.getByTestId('boostRule')).toHaveTextContent('_default-data-streamsDefault');
  });
});
