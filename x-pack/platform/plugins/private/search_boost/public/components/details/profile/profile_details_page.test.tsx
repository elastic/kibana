/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { contentListQueryClient } from '@kbn/content-list-provider';
import type { DataStreamsBoostProfile } from '../../../../common/types';
import { getMockProfile, getMockRule, getMockRulesUsing } from '../../test_utils/mock_details_data';
import type { ProfileDetailsPageProps } from './profile_details_page';
import { ProfileDetailsPage } from './profile_details_page';

const linkProps = () => ({ href: '#', onClick: jest.fn() });

const renderPage = (props: Partial<ProfileDetailsPageProps> = {}) => {
  const profile = props.profile ?? getMockProfile('catalog-fast');
  const allProps: ProfileDetailsPageProps = {
    profile,
    rules: getMockRulesUsing(profile.name),
    backLinkProps: linkProps(),
    getRuleLinkProps: linkProps,
    getRulesListLinkProps: linkProps,
    ...props,
  };
  render(
    <I18nProvider>
      <ProfileDetailsPage {...allProps} />
    </I18nProvider>
  );
  return allProps;
};

const getSetting = (id: string) => screen.getByTestId(`searchBoostSetting-${id}`);

const dataStreamsProfile = getMockProfile('logs-recent-week') as DataStreamsBoostProfile;

describe('ProfileDetailsPage', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('shows the settings of an indices profile', () => {
    renderPage();

    expect(getSetting('boost')).toHaveTextContent('2–8.5');
    expect(getSetting('oneExtraCopy')).toHaveTextContent('On');
    expect(getSetting('prewarm')).toHaveTextContent('On');
    expect(getSetting('pinned')).toHaveTextContent('Off');
    expect(screen.queryByTestId('searchBoostTimeline')).not.toBeInTheDocument();
  });

  it('shows the periods and timeline of a data streams profile', () => {
    renderPage({ profile: dataStreamsProfile });

    expect(getSetting('recent')).toHaveTextContent('1.5–5,000 boostData up to 1 day old');
    expect(getSetting('standard')).toHaveTextContent('1–10 boostData 1 day–7 days old');
    expect(getSetting('background')).toHaveTextContent('0–1 boostData older than 7 days');
    expect(screen.getByTestId('searchBoostTimeline')).toBeInTheDocument();
  });

  it('marks periods that never hold data as skipped', () => {
    renderPage({
      profile: { ...dataStreamsProfile, recent: { ...dataStreamsProfile.recent, max_age: '0d' } },
    });

    expect(getSetting('recent')).toHaveTextContent('Skipped');
    expect(getSetting('standard')).toHaveTextContent('Data up to 7 days old');
  });

  it('shows the usage of the rules using the profile', () => {
    renderPage({ profile: dataStreamsProfile });

    expect(getSetting('rulesUsing')).toHaveTextContent(/^2$/);
    expect(
      within(getSetting('rulesUsing')).getByRole('link', {
        name: 'View 2 rules using boost profile "logs-recent-week"',
      })
    ).toBeInTheDocument();
    expect(getSetting('appliesTo')).toHaveTextContent('2 data streams');
    expect(getSetting('storageSize')).toHaveTextContent('26.5 GB');
  });

  it('lists the rules using the profile, with their storage size', async () => {
    renderPage({ profile: dataStreamsProfile });

    const getRuleNames = () =>
      within(screen.getByTestId('searchBoostProfileRulesTable'))
        .getAllByTestId('searchBoostRuleLink')
        .map(({ textContent }) => textContent);

    await waitFor(() => expect(getRuleNames()).toEqual(['apache-logs', 'web-logs']));
    expect(screen.getByTestId('searchBoostProfileRulesCount')).toHaveTextContent(
      'Showing 1–2 of 2 boost rules'
    );
    expect(screen.getByTestId('searchBoostProfileRulesTable')).toHaveTextContent('19.6 GB');
    expect(screen.queryByText('Profile name')).not.toBeInTheDocument();

    const search = await screen.findByPlaceholderText('Search boost rules');
    await userEvent.type(search, 'web');
    await waitFor(() => expect(getRuleNames()).toEqual(['web-logs']));

    // Every rule here uses the profile, so the search leaves its name out.
    await userEvent.clear(search);
    await userEvent.type(search, 'recent');
    expect(await screen.findByText('No items found')).toBeInTheDocument();
  });

  it("doesn't carry the rules search over to another profile", async () => {
    const pageProps = {
      backLinkProps: linkProps(),
      getRuleLinkProps: linkProps,
      getRulesListLinkProps: linkProps,
    };
    const logsRules = getMockRulesUsing('logs-recent-week');
    const catalogRules = getMockRulesUsing('catalog-fast');
    const { rerender } = render(
      <I18nProvider>
        <ProfileDetailsPage {...pageProps} profile={dataStreamsProfile} rules={logsRules} />
      </I18nProvider>
    );
    await userEvent.type(await screen.findByPlaceholderText('Search boost rules'), 'web');
    expect(await screen.findByRole('link', { name: 'web-logs' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'apache-logs' })).not.toBeInTheDocument()
    );

    rerender(
      <I18nProvider>
        <ProfileDetailsPage
          {...pageProps}
          profile={getMockProfile('catalog-fast')}
          rules={catalogRules}
        />
      </I18nProvider>
    );

    expect(await screen.findByPlaceholderText('Search boost rules')).toHaveValue('');
    expect(await screen.findByRole('link', { name: 'catalog' })).toBeInTheDocument();
  });

  it('calls the row actions of the rules using the profile', async () => {
    const onEditRule = jest.fn();
    const onDuplicateRule = jest.fn();
    const onDeleteRule = jest.fn();
    renderPage({
      profile: dataStreamsProfile,
      canEdit: true,
      onEditRule,
      onDuplicateRule,
      onDeleteRule,
    });
    const webLogs = getMockRule('web-logs');
    const getRow = async () =>
      (await screen.findByRole('link', { name: 'web-logs' })).closest('tr')!;
    const openAllActions = async () =>
      userEvent.click(within(await getRow()).getByRole('button', { name: /^All actions/ }));

    await userEvent.click(within(await getRow()).getByRole('button', { name: 'Edit' }));
    expect(onEditRule).toHaveBeenCalledWith(webLogs);

    await openAllActions();
    await userEvent.click(await screen.findByTestId('searchBoostDuplicateRule'));
    expect(onDuplicateRule).toHaveBeenCalledWith(webLogs);

    await openAllActions();
    await userEvent.click(await screen.findByTestId('searchBoostDeleteRule'));
    expect(onDeleteRule).toHaveBeenCalledWith(webLogs);
  });

  describe.each([
    ['beside the rules', getMockRulesUsing('logs-recent-week'), 'searchBoostProfileRulesTable'],
    ['in the empty state', [], 'searchBoostProfileNotInUse'],
  ])('"Create boost rule" %s', (_, rules, shownTestSubj) => {
    it('calls back for users who can edit', async () => {
      const onCreateRule = jest.fn();
      renderPage({ profile: dataStreamsProfile, rules, canEdit: true, onCreateRule });

      await userEvent.click(await screen.findByTestId('searchBoostProfileCreateRule'));
      expect(onCreateRule).toHaveBeenCalled();
    });

    it("isn't shown to users who can't edit", async () => {
      renderPage({ profile: dataStreamsProfile, rules, onCreateRule: jest.fn() });

      expect(await screen.findByTestId(shownTestSubj)).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostProfileCreateRule')).not.toBeInTheDocument();
    });
  });

  it('explains a profile no rule uses, offering to create one to users who can edit', async () => {
    renderPage({
      profile: getMockProfile('archive-cheap'),
      rules: [],
      canEdit: true,
      onCreateRule: jest.fn(),
    });

    expect(getSetting('rulesUsing')).toHaveTextContent(/^0$/);
    expect(within(getSetting('rulesUsing')).queryByRole('link')).not.toBeInTheDocument();
    expect(await screen.findByTestId('searchBoostProfileNotInUse')).toHaveTextContent(
      "This profile isn't in useNo boost rules use it yet. Create one to boost indices with this profile."
    );
  });

  it("doesn't suggest creating a rule to users who can't edit", async () => {
    renderPage({ profile: getMockProfile('archive-cheap'), rules: [], onCreateRule: jest.fn() });

    expect(await screen.findByTestId('searchBoostProfileNotInUse')).toHaveTextContent(
      /^This profile isn't in useNo boost rules use it yet\.$/
    );
  });

  it('shows a loading state', () => {
    renderPage({ isLoading: true });

    expect(screen.getByTestId('searchBoostLoading')).toBeInTheDocument();
  });

  it('shows a not found state', () => {
    render(
      <I18nProvider>
        <ProfileDetailsPage
          rules={[]}
          backLinkProps={linkProps()}
          getRuleLinkProps={linkProps}
          getRulesListLinkProps={linkProps}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('searchBoostNotFound')).toHaveTextContent('Boost profile not found');
  });
});
