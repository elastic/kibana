/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { formatTimestamp } from './entries';
import { AlertEpisodeTimelineRelativeTimestamp } from './timeline_relative_timestamp';

jest.mock('@kbn/i18n-react', () => {
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en', messages: {} });

  return {
    ...jest.requireActual('@kbn/i18n-react'),
    FormattedRelative: () => <>5 minutes ago</>,
  };
});

const TIMESTAMP = '2026-07-02T10:00:00.000Z';

describe('AlertEpisodeTimelineRelativeTimestamp', () => {
  it('renders the relative time', () => {
    render(
      <I18nProvider>
        <AlertEpisodeTimelineRelativeTimestamp timestamp={TIMESTAMP} />
      </I18nProvider>
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('shows the full timestamp in a tooltip on hover', async () => {
    render(
      <I18nProvider>
        <AlertEpisodeTimelineRelativeTimestamp timestamp={TIMESTAMP} />
      </I18nProvider>
    );

    fireEvent.mouseOver(screen.getByTestId('alertingV2TimelineRelativeTimestamp'));

    await waitFor(() => {
      expect(screen.getByText(formatTimestamp(TIMESTAMP))).toBeInTheDocument();
    });
  });
});
