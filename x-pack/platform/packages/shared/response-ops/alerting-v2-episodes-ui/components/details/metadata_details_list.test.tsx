/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { AlertEpisodeMetadataDetailsList } from './metadata_details_list';

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

describe('AlertEpisodeMetadataDetailsList', () => {
  it('renders all rows when values are provided', () => {
    render(
      <I18nProvider>
        <AlertEpisodeMetadataDetailsList
          groupingFields={['host.name']}
          groupingData={{ 'host.name': 'host-a' }}
          triggeredAt="2024-01-01T00:00:00.000Z"
          durationMs={5000}
          assigneeUid="user-1"
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Grouping')).toBeInTheDocument();
    expect(screen.getByTestId('mockGroupingTags')).toHaveTextContent('host.name=host-a');
    expect(screen.getByText('Triggered')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('user-1');
  });

  it('renders dashes when optional values are missing', () => {
    render(
      <I18nProvider>
        <AlertEpisodeMetadataDetailsList
          groupingFields={[]}
          groupingData={{}}
          triggeredAt={undefined}
          durationMs={undefined}
          assigneeUid={undefined}
          userProfile={mockUserProfile}
        />
      </I18nProvider>
    );

    // 2 dashes: triggeredAt + durationMs ('—' character)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('mockAssigneeCell')).toHaveTextContent('no-assignee');
  });
});
