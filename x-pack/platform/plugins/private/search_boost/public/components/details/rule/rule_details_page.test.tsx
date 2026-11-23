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
import { getMockProfile, getMockRule } from '../../test_utils/mock_details_data';
import type { RuleDetailsPageProps } from './rule_details_page';
import { RuleDetailsPage } from './rule_details_page';

const linkProps = () => ({ href: '#', onClick: jest.fn() });

const renderPage = (props: Partial<RuleDetailsPageProps> = {}) => {
  const rule = props.rule ?? getMockRule('catalog');
  const allProps: RuleDetailsPageProps = {
    rule,
    profile: getMockProfile(rule.boost_profile),
    backLinkProps: linkProps(),
    getProfileLinkProps: linkProps,
    getRuleLinkProps: linkProps,
    getMatchLinkProps: linkProps,
    ...props,
  };
  render(
    <I18nProvider>
      <RuleDetailsPage {...allProps} />
    </I18nProvider>
  );
  return allProps;
};

const getSetting = (id: string) => screen.getByTestId(`searchBoostSetting-${id}`);

const getMatchNames = () =>
  within(screen.getByTestId('searchBoostMatchesTable'))
    .queryAllByTestId('searchBoostMatchLink')
    .map(({ textContent }) => textContent);

describe('RuleDetailsPage', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('shows the rule settings and usage', () => {
    renderPage();

    expect(getSetting('profile')).toHaveTextContent('catalog-fast');
    expect(getSetting('targets')).toHaveTextContent('catalog-*');
    expect(getSetting('priority')).toHaveTextContent('10');
    expect(getSetting('matches')).toHaveTextContent('2 indices');
    expect(getSetting('appliesTo')).toHaveTextContent('2 indices');
    expect(getSetting('storageSize')).toHaveTextContent('1.4 GB');
  });

  it('counts only what the rule applies to, and marks managed profiles', () => {
    renderPage({ rule: getMockRule('default_indices') });

    expect(getSetting('profile')).toHaveTextContent('default_indices Managed');
    expect(getSetting('matches')).toHaveTextContent('6 indices');
    expect(getSetting('appliesTo')).toHaveTextContent('4 indices');
  });

  it('lists the matches, marking the outranked ones once that data is passed in', async () => {
    renderPage({ rule: getMockRule('default_indices'), isOutrankingComputed: true });

    expect(screen.getByText('Matching indices')).toBeInTheDocument();
    await waitFor(() =>
      expect(getMatchNames()).toEqual([
        'catalog-products',
        'catalog-reviews',
        'customers',
        'orders',
      ])
    );
    expect(screen.getAllByTestId('searchBoostOutrankedByLink')).toHaveLength(2);
  });

  it("doesn't carry the matches search over to another rule", async () => {
    const pageProps = {
      backLinkProps: linkProps(),
      getProfileLinkProps: linkProps,
      getRuleLinkProps: linkProps,
      getMatchLinkProps: linkProps,
    };
    const { rerender } = render(
      <I18nProvider>
        <RuleDetailsPage {...pageProps} rule={getMockRule('catalog')} />
      </I18nProvider>
    );
    await userEvent.type(await screen.findByPlaceholderText('Search indices'), 'reviews');
    await waitFor(() => expect(getMatchNames()).toEqual(['catalog-reviews']));

    rerender(
      <I18nProvider>
        <RuleDetailsPage {...pageProps} rule={getMockRule('default_indices')} />
      </I18nProvider>
    );

    expect(await screen.findByPlaceholderText('Search indices')).toHaveValue('');
    await waitFor(() =>
      expect(getMatchNames()).toEqual([
        'catalog-products',
        'catalog-reviews',
        'customers',
        'orders',
      ])
    );
  });

  it('links to the profile before it has loaded', () => {
    renderPage({ rule: getMockRule('web-logs'), profile: undefined });

    expect(getSetting('profile')).toHaveTextContent(/^logs-recent-week$/);
    expect(screen.queryByTestId('searchBoostTimeline')).not.toBeInTheDocument();
  });

  it('shows the timeline for a rule that uses a data streams profile', () => {
    renderPage({ rule: getMockRule('web-logs') });

    expect(screen.getByText('Boost phase timeline')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostTimeline')).toBeInTheDocument();
    expect(screen.getByText('Matching data streams')).toBeInTheDocument();
  });

  it('leaves the timeline out for an indices rule', () => {
    renderPage();

    expect(screen.queryByTestId('searchBoostTimeline')).not.toBeInTheDocument();
  });

  describe('states', () => {
    it('shows a loading state', () => {
      renderPage({ isLoading: true });

      expect(screen.getByTestId('searchBoostLoading')).toBeInTheDocument();
    });

    it('shows a not found state', async () => {
      const backLinkProps = linkProps();
      render(
        <I18nProvider>
          <RuleDetailsPage
            backLinkProps={backLinkProps}
            getProfileLinkProps={linkProps}
            getRuleLinkProps={linkProps}
            getMatchLinkProps={linkProps}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('searchBoostNotFound')).toHaveTextContent('Boost rule not found');
      expect(screen.getByTestId('searchBoostNotFoundBack')).toHaveTextContent(
        'Back to boost rules'
      );

      await userEvent.click(screen.getByTestId('searchBoostNotFoundBack'));
      expect(backLinkProps.onClick).toHaveBeenCalled();
    });
  });
});
