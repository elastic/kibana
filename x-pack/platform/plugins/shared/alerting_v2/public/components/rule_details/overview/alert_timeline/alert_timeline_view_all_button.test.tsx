/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertTimelineViewAllButton } from './alert_timeline_view_all_button';

const VIEW_ALL_HREF = '/app/alerting/episodes?ruleId=abc';
const DISCOVER_HREF = '/app/discover#/?_g=()';

const wrap = (props: React.ComponentProps<typeof AlertTimelineViewAllButton>) =>
  render(
    <I18nProvider>
      <AlertTimelineViewAllButton {...props} />
    </I18nProvider>
  );

describe('AlertTimelineViewAllButton', () => {
  describe('without discoverHref', () => {
    it('renders a plain button linking to viewAllHref', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF });

      const btn = screen.getByTestId('alertTimelineViewAllEpisodes');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('href', VIEW_ALL_HREF);
    });

    it('displays "View all episodes" label', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF });

      expect(screen.getByTestId('alertTimelineViewAllEpisodes')).toHaveTextContent(
        'View all episodes'
      );
    });

    it('does not render the split button or dropdown toggle', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF });

      expect(screen.queryByTestId('alertTimelineViewAllSplitButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertTimelineViewAllMenuButton')).not.toBeInTheDocument();
    });
  });

  describe('with discoverHref', () => {
    it('renders the split button', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF, discoverHref: DISCOVER_HREF });

      expect(screen.getByTestId('alertTimelineViewAllSplitButton')).toBeInTheDocument();
    });

    it('primary action links to viewAllHref', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF, discoverHref: DISCOVER_HREF });

      const primary = screen.getByTestId('alertTimelineViewAllEpisodes');
      expect(primary).toHaveAttribute('href', VIEW_ALL_HREF);
      expect(primary).toHaveTextContent('View all episodes');
    });

    it('secondary toggle button is rendered', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF, discoverHref: DISCOVER_HREF });

      expect(screen.getByTestId('alertTimelineViewAllMenuButton')).toBeInTheDocument();
    });

    it('menu is closed by default', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF, discoverHref: DISCOVER_HREF });

      expect(screen.queryByTestId('alertTimelineViewInDiscover')).not.toBeInTheDocument();
    });

    it('opens menu on secondary button click and shows "View in Discover"', () => {
      wrap({ viewAllHref: VIEW_ALL_HREF, discoverHref: DISCOVER_HREF });

      fireEvent.click(screen.getByTestId('alertTimelineViewAllMenuButton'));

      const discoverItem = screen.getByTestId('alertTimelineViewInDiscover');
      expect(discoverItem).toBeInTheDocument();
      expect(discoverItem).toHaveAttribute('href', DISCOVER_HREF);
    });
  });
});
