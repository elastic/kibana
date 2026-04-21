/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { AboutTab } from './about_tab';
import type { QueryItemAgents } from './about_tab';
import { useGenericBulkGetUserProfiles } from '../../../common/use_bulk_get_user_profiles';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { TestProviders } from '../../../actions/__test_helpers__/mock_data';

jest.mock('../../../common/use_bulk_get_user_profiles');

const useGenericBulkGetUserProfilesMock = useGenericBulkGetUserProfiles as jest.MockedFunction<
  typeof useGenericBulkGetUserProfiles
>;

const renderWithProviders = (element: React.ReactElement) =>
  render(element, { wrapper: TestProviders });

const createMockData = (overrides?: Partial<LiveQueryDetailsItem>): LiveQueryDetailsItem => ({
  action_id: 'test-action-1',
  '@timestamp': '2025-12-05T14:30:00.000Z',
  agent_all: false,
  agent_ids: ['agent-1', 'agent-2'],
  agent_platforms: [],
  agent_policy_ids: [],
  agents: ['agent-1', 'agent-2'],
  user_id: 'elastic',
  status: 'completed',
  queries: [
    {
      action_id: 'test-action-1',
      id: 'suspicious_processes_linux',
      query: 'SELECT pid, name, path FROM processes WHERE on_disk = 0',
      agents: ['agent-1', 'agent-2'],
    },
  ],
  ...overrides,
});

const mockQueryItemAgents: QueryItemAgents = {
  successful: 2,
  pending: 0,
  failed: 0,
  docs: 42,
};

describe('AboutTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGenericBulkGetUserProfilesMock.mockReturnValue({
      profilesMap: new Map(),
      isLoading: false,
    });
  });

  it('renders the query card with query text', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.getByTestId('osquery-about-tab-query-card')).toBeInTheDocument();
    expect(screen.getByTestId('osquery-about-tab-query-code')).toHaveTextContent(
      'SELECT pid, name, path FROM processes WHERE on_disk = 0'
    );
  });

  it('renders the query ID in a copyable code block', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    const queryIdBlock = screen.getByTestId('osquery-about-tab-query-id');
    expect(queryIdBlock).toBeInTheDocument();
    expect(queryIdBlock).toHaveTextContent('suspicious_processes_linux');
  });

  it('does not render the query ID when query has no id', () => {
    const data = createMockData({
      queries: [
        {
          action_id: 'test-action-1',
          id: '',
          query: 'SELECT 1',
          agents: ['agent-1'],
        },
      ],
    });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.queryByTestId('osquery-about-tab-query-id')).not.toBeInTheDocument();
  });

  it('renders the about card with Created at and Run at fields', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.getByTestId('osquery-about-tab-about-card')).toBeInTheDocument();
    expect(screen.getByText('Created at')).toBeInTheDocument();
    expect(screen.getByText('Run at')).toBeInTheDocument();
  });

  it('does not render a Status field in the about card', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('renders rows and agents from queryItemAgents', () => {
    renderWithProviders(<AboutTab data={createMockData()} queryItemAgents={mockQueryItemAgents} />);

    expect(screen.getByText('Rows')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('does not render rows/agents when queryItemAgents is not provided', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.queryByText('Rows')).not.toBeInTheDocument();
    expect(screen.queryByText('Agents')).not.toBeInTheDocument();
  });

  it('renders the run by column with user profile', () => {
    const mockProfile: UserProfileWithAvatar = {
      uid: 'profile-uid-1',
      enabled: true,
      user: { username: 'admin', full_name: 'Admin User' },
      data: { avatar: {} },
    };

    useGenericBulkGetUserProfilesMock.mockReturnValue({
      profilesMap: new Map([['profile-uid-1', mockProfile]]),
      isLoading: false,
    });

    const data = createMockData({ user_profile_uid: 'profile-uid-1' });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.getByText('Run by')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('renders fallback for run by when no profile is available', () => {
    const data = createMockData({ user_id: 'elastic', user_profile_uid: undefined });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
  });

  it('does not render schedule card for non-scheduled, non-pack queries', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.queryByTestId('osquery-about-tab-schedule-card')).not.toBeInTheDocument();
  });

  it('renders schedule card when isScheduled is true', () => {
    const data = createMockData({
      queries: [
        {
          action_id: 'test-action-1',
          id: 'q1',
          query: 'SELECT 1',
          agents: ['agent-1'],
          interval: 3600,
        },
      ],
    });

    renderWithProviders(<AboutTab data={data} isScheduled executionCount={647} />);

    expect(screen.getByTestId('osquery-about-tab-schedule-card')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('does not render schedule card for live pack queries without isScheduled', () => {
    const data = createMockData({
      pack_id: 'my-pack-123',
      queries: [
        {
          action_id: 'test-action-1',
          id: 'q1',
          query: 'SELECT 1',
          agents: ['agent-1'],
          interval: 1800,
        },
      ],
    });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.queryByTestId('osquery-about-tab-schedule-card')).not.toBeInTheDocument();
  });

  it('renders execution count only for scheduled queries', () => {
    renderWithProviders(<AboutTab data={createMockData()} isScheduled executionCount={647} />);

    expect(screen.getByText('Execution count')).toBeInTheDocument();
    expect(screen.getByText('647')).toBeInTheDocument();
  });

  it('does not render execution count for non-scheduled queries', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.queryByText('Execution count')).not.toBeInTheDocument();
  });

  it('renders tags when present for non-scheduled queries', () => {
    const data = createMockData({ tags: ['endpoint', 'forensic', 'linux'] });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.getByTestId('osquery-about-tab-tags-card')).toBeInTheDocument();
    expect(screen.getByText('endpoint')).toBeInTheDocument();
    expect(screen.getByText('forensic')).toBeInTheDocument();
    expect(screen.getByText('linux')).toBeInTheDocument();
  });

  it('renders "No tags added" for empty tags', () => {
    const data = createMockData({ tags: [] });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.getByTestId('osquery-about-tab-tags-card')).toBeInTheDocument();
    expect(screen.getByText('No tags added')).toBeInTheDocument();
  });

  it('does not render tags card for scheduled queries', () => {
    const data = createMockData({ tags: ['endpoint'] });

    renderWithProviders(<AboutTab data={data} isScheduled />);

    expect(screen.queryByTestId('osquery-about-tab-tags-card')).not.toBeInTheDocument();
  });

  it('renders edit tags button when onEditTags is provided', () => {
    const handleEditTags = jest.fn();
    renderWithProviders(<AboutTab data={createMockData()} onEditTags={handleEditTags} />);

    const editButton = screen.getByTestId('osquery-about-tab-edit-tags');
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);
    expect(handleEditTags).toHaveBeenCalledTimes(1);
  });

  it('does not render edit tags button when onEditTags is not provided', () => {
    renderWithProviders(<AboutTab data={createMockData()} />);

    expect(screen.queryByTestId('osquery-about-tab-edit-tags')).not.toBeInTheDocument();
  });

  it('handles missing queries gracefully', () => {
    const data = createMockData({ queries: undefined });

    renderWithProviders(<AboutTab data={data} />);

    expect(screen.getByTestId('osquery-about-tab-query-card')).toBeInTheDocument();
    expect(screen.queryByTestId('osquery-about-tab-query-id')).not.toBeInTheDocument();
  });
});
