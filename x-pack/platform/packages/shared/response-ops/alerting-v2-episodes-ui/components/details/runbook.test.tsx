/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertEpisodeRunbook } from './runbook';

describe('AlertEpisodeRunbook', () => {
  it('renders the empty state when no content is provided', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={undefined} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookEmpty')).toBeInTheDocument();
  });

  it('renders the markdown content when provided', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookContent')).toBeInTheDocument();
  });
});
