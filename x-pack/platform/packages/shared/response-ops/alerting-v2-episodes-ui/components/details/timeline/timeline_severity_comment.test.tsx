/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EpisodeSeverity } from '../../severity/severity_utils';
import type { SeverityChangeEntry } from './entries';
import { AlertEpisodeTimelineSeverityComment } from './timeline_severity_comment';

const renderComment = (entry: SeverityChangeEntry) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineSeverityComment entry={entry} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineSeverityComment', () => {
  it('renders the initial-severity sentence with the new severity badge', () => {
    renderComment({
      kind: 'severity_change',
      timestamp: '2026-07-02T10:00:00.000Z',
      newSeverity: EpisodeSeverity.High,
      prevSeverity: undefined,
      prevEventCount: 0,
    });

    expect(screen.getByText('set the severity to')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-high')).toBeInTheDocument();
  });

  it('renders the changed-severity sentence with the after-N-events label', () => {
    renderComment({
      kind: 'severity_change',
      timestamp: '2026-07-02T10:00:00.000Z',
      newSeverity: EpisodeSeverity.Critical,
      prevSeverity: EpisodeSeverity.High,
      prevEventCount: 3,
    });

    expect(screen.getByText('changed the severity to')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-critical')).toBeInTheDocument();
    expect(screen.getByText(/after 3 high events/i)).toBeInTheDocument();
  });
});
