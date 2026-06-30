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
import { AlertEpisodeOverviewList } from './overview_list';

jest.mock('../assignee_cell', () => ({
  AlertEpisodeAssigneeCell: ({ assigneeUid }: { assigneeUid: string | null | undefined }) => (
    <div data-test-subj="mockAssigneeCell">{assigneeUid ?? 'no-assignee'}</div>
  ),
}));

jest.mock('../grouping/alerting_episode_grouping_tags', () => ({
  AlertingEpisodeGroupingTags: ({
    fields,
    data,
  }: {
    fields: readonly string[];
    data: Record<string, unknown>;
  }) => (
    <div data-test-subj="mockGroupingTags">
      {fields.map((field) => `${field}=${String(data[field] ?? '')}`).join(',')}
    </div>
  ),
}));

const mockUserProfile = userProfileServiceMock.createStart();

const baseProps = {
  groupingFields: ['host.name'],
  groupingData: { 'host.name': 'host-a' },
  triggeredAt: '2024-01-01T00:00:00.000Z',
  durationMs: 5000,
  assigneeUid: 'user-1',
  episodeAction: undefined,
  groupAction: undefined,
  userProfile: mockUserProfile,
};

describe('AlertEpisodeOverviewList', () => {
  it('renders the metadata rows', () => {
    render(
      <I18nProvider>
        <AlertEpisodeOverviewList {...baseProps} />
      </I18nProvider>
    );

    expect(screen.getByText('Grouping')).toBeInTheDocument();
    expect(screen.getByTestId('mockGroupingTags')).toHaveTextContent('host.name=host-a');
    expect(screen.getByText('Triggered')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('user-1');
  });

  it('renders dashes for missing optional metadata values', () => {
    render(
      <I18nProvider>
        <AlertEpisodeOverviewList
          {...baseProps}
          groupingFields={[]}
          groupingData={{}}
          triggeredAt={undefined}
          durationMs={undefined}
          assigneeUid={undefined}
        />
      </I18nProvider>
    );

    // triggeredAt + durationMs render '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('no-assignee');
  });

  it('renders the acknowledged-by row when episode is acked', () => {
    render(
      <I18nProvider>
        <AlertEpisodeOverviewList
          {...baseProps}
          episodeAction={{
            episodeId: 'ep-1',
            ruleId: 'rule-1',
            groupHash: 'gh-1',
            lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
            lastAssigneeUid: null,
            lastAckActor: 'user-acker',
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Acknowledged by')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('mockAssigneeCell').find((el) => el.textContent === 'user-acker')
    ).toBeInTheDocument();
  });

  it('renders the resolved-by row when the group is resolved', () => {
    render(
      <I18nProvider>
        <AlertEpisodeOverviewList
          {...baseProps}
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
        />
      </I18nProvider>
    );

    expect(screen.getByText('Resolved by')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('mockAssigneeCell').find((el) => el.textContent === 'user-resolver')
    ).toBeInTheDocument();
  });

  it('renders the snoozed-by and snoozed-until rows when the group is snoozed', () => {
    render(
      <I18nProvider>
        <AlertEpisodeOverviewList
          {...baseProps}
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
        />
      </I18nProvider>
    );

    expect(screen.getByText('Snoozed by')).toBeInTheDocument();
    expect(screen.getByText('Snoozed until')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('mockAssigneeCell').find((el) => el.textContent === 'user-snoozer')
    ).toBeInTheDocument();
  });
});
