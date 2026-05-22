/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { AlertEpisodeActionsOverview } from './actions_overview';

jest.mock('../assignee_cell', () => ({
  AlertEpisodeAssigneeCell: ({ assigneeUid }: { assigneeUid: string | null | undefined }) => (
    <div data-test-subj="mockAssigneeCell">{assigneeUid ?? 'no-assignee'}</div>
  ),
}));

const mockUserProfile = userProfileServiceMock.createStart();

describe('AlertEpisodeActionsOverview', () => {
  it('renders the empty state when no actions are present', () => {
    render(
      <I18nProvider>
        <AlertEpisodeActionsOverview
          episodeAction={undefined}
          groupAction={undefined}
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2EpisodeDetailsActionsOverviewEmpty')).toBeInTheDocument();
  });

  it('renders the acknowledged-by row when episode is acked', () => {
    render(
      <I18nProvider>
        <AlertEpisodeActionsOverview
          episodeAction={{
            episodeId: 'ep-1',
            ruleId: 'rule-1',
            groupHash: 'gh-1',
            lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
            lastAssigneeUid: null,
            lastAckActor: 'user-acker',
          }}
          groupAction={undefined}
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Acknowledged by')).toBeInTheDocument();
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('user-acker');
  });

  it('renders the resolved-by row when the group is resolved', () => {
    render(
      <I18nProvider>
        <AlertEpisodeActionsOverview
          episodeAction={undefined}
          groupAction={{
            groupHash: 'gh-1',
            ruleId: 'rule-1',
            lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
            lastDeactivateActor: 'user-resolver',
            lastSnoozeAction: null,
            snoozeExpiry: null,
            tags: [],
            lastSnoozeActor: null,
          }}
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Resolved by')).toBeInTheDocument();
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('user-resolver');
  });

  it('renders the snoozed-by and snoozed-until rows when the group is snoozed', () => {
    render(
      <I18nProvider>
        <AlertEpisodeActionsOverview
          episodeAction={undefined}
          groupAction={{
            groupHash: 'gh-1',
            ruleId: 'rule-1',
            lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
            lastSnoozeActor: 'user-snoozer',
            snoozeExpiry: '2030-01-01T00:00:00.000Z',
            lastDeactivateAction: null,
            lastDeactivateActor: null,
            tags: [],
          }}
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Snoozed by')).toBeInTheDocument();
    expect(screen.getByText('Snoozed until')).toBeInTheDocument();
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('user-snoozer');
  });
});
