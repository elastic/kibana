/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpStart } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeActions } from './actions';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { useFetchAlertEpisodeTagSuggestions } from '../../hooks/use_fetch_alert_episode_tag_suggestions';

jest.mock('../../hooks/use_create_alert_action');
jest.mock('../../hooks/use_fetch_alert_episode_tag_suggestions');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);
const useFetchAlertEpisodeTagSuggestionsMock = jest.mocked(useFetchAlertEpisodeTagSuggestions);

const mockHttp: HttpStart = httpServiceMock.createStartContract();
const mockExpressions = expressionsPluginMock.createStartContract();

useCreateAlertActionMock.mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
} as unknown as ReturnType<typeof useCreateAlertAction>);
useFetchAlertEpisodeTagSuggestionsMock.mockReturnValue({
  data: [],
  isLoading: false,
  isError: false,
  isSuccess: true,
} as unknown as ReturnType<typeof useFetchAlertEpisodeTagSuggestions>);

describe('AlertEpisodeActionsCell', () => {
  it('renders acknowledge, snooze, and more-actions controls', () => {
    render(<AlertEpisodeActions http={mockHttp} expressions={mockExpressions} />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeActionsMoreButton')).toBeInTheDocument();
  });

  it('renders view details as a link when viewDetailsHref is provided', () => {
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        viewDetailsHref="/app/management/alertingV2/episodes/ep-1"
      />
    );
    expect(screen.getByTestId('alertingEpisodeActionsViewDetailsButton')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/episodes/ep-1'
    );
  });

  it('opens popover and shows Resolve when not deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('shows Unresolve in popover when group action is deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByText('Unresolve')).toBeInTheDocument();
  });

  it('shows Open in Discover in popover when openInDiscoverHref is provided', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        openInDiscoverHref="/app/discover#/?_a=esql"
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    const link = screen.getByTestId('alertingEpisodeOpenInDiscoverButton');
    expect(link).toHaveTextContent('Open in Discover');
    expect(link).toHaveAttribute('href', '/app/discover#/?_a=esql');
  });

  it('does not show Open in Discover when openInDiscoverHref is omitted', async () => {
    const user = userEvent.setup();
    render(<AlertEpisodeActions http={mockHttp} expressions={mockExpressions} />);
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.queryByTestId('alertingEpisodeOpenInDiscoverButton')).not.toBeInTheDocument();
  });

  it('shows Edit Tags in the more-actions menu', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByTestId('alertingEpisodeActionsTagsButton')).toBeInTheDocument();
    expect(screen.getByText('Edit Tags')).toBeInTheDocument();
  });

  it('shows Edit assignee when episodeId and groupHash are set', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        episodeId="ep-1"
        groupHash="gh-1"
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByTestId('alertingEpisodeActionsEditAssigneeButton')).toBeInTheDocument();
    expect(screen.getByText('Edit assignee')).toBeInTheDocument();
  });

  it('does not show Edit assignee without episodeId and groupHash', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActions
        http={mockHttp}
        expressions={mockExpressions}
        episodeId="ep-1"
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(
      screen.queryByTestId('alertingEpisodeActionsEditAssigneeButton')
    ).not.toBeInTheDocument();
  });
});
