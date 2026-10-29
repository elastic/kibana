/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertEpisodeCollapsedEventsWarning } from './collapsed_events_warning';

describe('AlertEpisodeCollapsedEventsWarning', () => {
  it('renders a warning icon whose tooltip names the event limit', async () => {
    render(
      <I18nProvider>
        <AlertEpisodeCollapsedEventsWarning eventLimit={2500} />
      </I18nProvider>
    );

    fireEvent.mouseOver(screen.getByTestId('alertingV2EpisodeCollapsedEventsWarning'));

    expect(
      await screen.findByText(
        'Severity and status changes are collapsed for alerts with over 2500 events'
      )
    ).toBeInTheDocument();
  });
});
