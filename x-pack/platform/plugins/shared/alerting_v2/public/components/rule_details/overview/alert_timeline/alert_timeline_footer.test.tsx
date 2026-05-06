/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertTimelineFooter } from './alert_timeline_footer';

const wrap = (href: string) =>
  render(
    <I18nProvider>
      <AlertTimelineFooter viewAllHref={href} />
    </I18nProvider>
  );

describe('AlertTimelineFooter', () => {
  it('renders a link with the provided href', () => {
    wrap('/app/alerting/episodes?ruleId=abc');
    const link = screen.getByTestId('alertTimelineViewAllEpisodes');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/alerting/episodes?ruleId=abc');
  });

  it('displays "View all episodes" text', () => {
    wrap('/episodes');
    expect(screen.getByTestId('alertTimelineViewAllEpisodes')).toHaveTextContent(
      'View all episodes'
    );
  });
});
