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
import { BUILTIN_PROFILES, DEFAULT_RULE_PROFILES, createDefaultRules } from '../../common/presets';
import type { BoostProfile, BoostState, DefaultRuleProfiles } from '../../common/types';
import { BoostPage } from './boost_page';

// The page header lives in Kibana's chrome, so a stand-in shows its title.
jest.mock('@kbn/app-header', () => {
  const { createElement } = jest.requireActual('react');
  return {
    AppHeader: ({ title }: { title: string }) => createElement('h1', null, title),
    AppHeaderLoading: () => null,
  };
});

const mockCapabilities = { boost: { save: true } };

jest.mock('../hooks/use_boost_services', () => ({
  useBoostServices: () => ({
    application: { capabilities: mockCapabilities },
    appParams: { setBreadcrumbs: jest.fn() },
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
  high_availability: 'none',
  prewarm: false,
  pinned: false,
};

const createState = (
  defaultProfiles: DefaultRuleProfiles = DEFAULT_RULE_PROFILES,
  customProfiles: BoostProfile[] = []
): BoostState => ({
  settings: { default_profiles: defaultProfiles },
  profiles: [...BUILTIN_PROFILES, ...customProfiles],
  rules: createDefaultRules(defaultProfiles),
  data_sources: [
    { name: 'products', type: 'index', size_in_bytes: 2e9 },
    { name: 'logs-app', type: 'data_stream', size_in_bytes: 3e9 },
  ],
});

let mockState = createState();
const mockUpdateDefaultRule = jest.fn();

jest.mock('../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: mockState }),
  useUpdateDefaultRule: () => ({ mutate: mockUpdateDefaultRule, isLoading: false }),
  useCreateRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useUpdateRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useDeleteRule: () => ({ mutate: jest.fn(), isLoading: false }),
  useCreateProfile: () => ({ mutate: jest.fn(), isLoading: false }),
  useUpdateProfile: () => ({ mutate: jest.fn(), isLoading: false }),
  useDeleteProfile: () => ({ mutate: jest.fn(), isLoading: false }),
}));

const renderPage = (path = '/') =>
  render(
    <IntlProvider locale="en">
      <MemoryRouter initialEntries={[path]}>
        <Route path="/:tab?" component={BoostPage} />
      </MemoryRouter>
    </IntlProvider>
  );

const getPanel = (type: 'indices' | 'data_streams') =>
  screen.getByTestId(`boostProjectDefault-${type}`);

// A choice in the editor is a card, whose test subject is on its radio's wrapper.
const getChoice = (testSubj: string) => within(screen.getByTestId(testSubj)).getByRole('radio');

beforeEach(() => {
  mockState = createState();
  mockCapabilities.boost.save = true;
  mockUpdateDefaultRule.mockClear();
});

describe('BoostPage', () => {
  it('shows the project defaults above the boost rules, with no mode to switch', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Project defaults' })).toBeInTheDocument();
    expect(screen.getByTestId('boostRulesTable')).toBeInTheDocument();
    expect(screen.queryByText('Advanced mode')).not.toBeInTheDocument();
  });

  it('shows the boost profiles on their tab', () => {
    renderPage('/profiles');

    expect(screen.getByTestId('boostProjectDefaults')).toBeInTheDocument();
    expect(screen.getByTestId('boostProfilesTable')).toBeInTheDocument();
  });
});

describe('Project defaults', () => {
  it('shows each default, and what it applies to through its default rule', () => {
    renderPage();

    expect(getPanel('indices')).toHaveTextContent('IndicesPerformant');
    expect(getPanel('indices')).toHaveTextContent('Applies to 1 index · 2 GB');
    expect(within(getPanel('indices')).getByRole('link', { name: '1 index' })).toHaveAttribute(
      'href',
      '/rules/elastic-default-indices'
    );
    expect(getPanel('data_streams')).toHaveTextContent('Data streamsLast 7 days');
    expect(getPanel('data_streams')).toHaveTextContent('Applies to 1 data stream · 3 GB');
  });

  it('shows a custom default as its profile, linked to its details', () => {
    mockState = createState({ ...DEFAULT_RULE_PROFILES, indices_profile: catalogSearch.name }, [
      catalogSearch,
    ]);
    renderPage();

    expect(
      within(getPanel('indices')).getByRole('link', { name: 'catalog-search' })
    ).toHaveAttribute('href', '/profiles/catalog-search');
    expect(getPanel('indices')).toHaveTextContent('Custom boost profile');
  });

  it("can't be edited without the privilege to", () => {
    mockCapabilities.boost.save = false;
    renderPage();

    expect(screen.queryByTestId('boostEditProjectDefault-indices')).not.toBeInTheDocument();
  });

  it('edits a default in a flyout, which saves the preset chosen', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('boostEditProjectDefault-indices'));

    const flyout = screen.getByTestId('boostProjectDefaultFlyout');
    expect(getChoice('boostProjectDefaultPreset-elastic-performant')).toBeChecked();
    // Nothing to save until the choice changes.
    expect(within(flyout).getByTestId('boostProjectDefaultSave')).toBeDisabled();

    await userEvent.click(
      within(flyout).getByTestId('boostProjectDefaultPreset-elastic-on-demand')
    );
    await userEvent.click(within(flyout).getByTestId('boostProjectDefaultSave'));

    expect(mockUpdateDefaultRule).toHaveBeenCalledWith(
      { type: 'indices', profileName: 'elastic-on-demand' },
      expect.anything()
    );
  });

  it('offers a custom profile once there is one of the type', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('boostEditProjectDefault-indices'));

    expect(getChoice('boostProjectDefaultCustom')).toBeDisabled();
  });

  it('saves a custom profile chosen in the flyout', async () => {
    mockState = createState(DEFAULT_RULE_PROFILES, [catalogSearch]);
    renderPage();
    await userEvent.click(screen.getByTestId('boostEditProjectDefault-indices'));

    await userEvent.click(screen.getByTestId('boostProjectDefaultCustom'));
    expect(screen.getByTestId('boostProjectDefaultCustomProfile')).toHaveValue('catalog-search');
    await userEvent.click(screen.getByTestId('boostProjectDefaultSave'));

    expect(mockUpdateDefaultRule).toHaveBeenCalledWith(
      { type: 'indices', profileName: 'catalog-search' },
      expect.anything()
    );
  });

  it("estimates the default rule's cost with the choice", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('boostEditProjectDefault-data_streams'));

    expect(screen.getByTestId('boostCostEstimate')).toHaveTextContent('1 data stream · 3 GB');
  });
});
