/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { StateChangeEntry } from './entries';
import { AlertEpisodeTimelineStateComment } from './timeline_state_comment';

const renderComment = (entry: StateChangeEntry) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineStateComment entry={entry} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineStateComment', () => {
  it('renders the initial-status sentence with the new status badge', () => {
    renderComment({
      kind: 'state_change',
      timestamp: '2026-07-02T10:00:00.000Z',
      newStatus: ALERT_EPISODE_STATUS.PENDING,
      prevStatus: undefined,
      prevEventCount: 0,
    });

    expect(screen.getByText('started the episode as')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the changed-status sentence with the after-N-events label', () => {
    renderComment({
      kind: 'state_change',
      timestamp: '2026-07-02T10:00:00.000Z',
      newStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.PENDING,
      prevEventCount: 5,
    });

    expect(screen.getByText('changed the status to')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/after 5 pending events/i)).toBeInTheDocument();
  });
});
