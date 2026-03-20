/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseUserActionsStats } from '../../containers/types';

import { FilterActivity } from './filter_activity';
import { renderWithTestingProviders } from '../../common/mock';

describe('FilterActivity ', () => {
  const onFilterActivityChange = jest.fn();

  const userActionsStats: CaseUserActionsStats = {
    total: 20,
    totalDeletions: 0,
    totalComments: 11,
    totalCommentCreations: 2,
    totalCommentDeletions: 0,
    totalHiddenCommentUpdates: 0,
    totalOtherActions: 9,
    totalOtherActionDeletions: 0,
  };

  const userActionsStatsWithDeletions: CaseUserActionsStats = {
    total: 20,
    totalDeletions: 2,
    totalComments: 11,
    totalCommentDeletions: 3,
    totalCommentCreations: 5,
    totalHiddenCommentUpdates: 1,
    totalOtherActions: 9,
    totalOtherActionDeletions: 4,
  };

  it('renders filters correctly', () => {
    renderWithTestingProviders(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    expect(screen.getByTestId('user-actions-filter-activity-group')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-activity-button-all')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-activity-button-comments')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-activity-button-history')).toBeInTheDocument();
  });

  it('renders filters correctly with deletions', () => {
    renderWithTestingProviders(
      <FilterActivity
        type="all"
        onFilterChange={onFilterActivityChange}
        userActionsStats={userActionsStatsWithDeletions}
      />
    );

    expect(screen.getByTestId('user-actions-filter-activity-button-all')).toHaveTextContent('16');
    expect(screen.getByTestId('user-actions-filter-activity-button-comments')).toHaveTextContent(
      '2'
    );
    expect(screen.getByTestId('user-actions-filter-activity-button-history')).toHaveTextContent(
      '9'
    );
  });

  it('renders loading state correctly', () => {
    renderWithTestingProviders(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} isLoading />
    );

    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('renders all as active filter by default', () => {
    renderWithTestingProviders(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    expect(
      screen
        .getByTestId('user-actions-filter-activity-button-all')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('renders comments as active filter', async () => {
    renderWithTestingProviders(
      <FilterActivity type="user" onFilterChange={onFilterActivityChange} />
    );

    await waitFor(() => {
      expect(
        screen
          .getByTestId('user-actions-filter-activity-button-comments')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });

  it('renders user actions stats correctly', async () => {
    renderWithTestingProviders(
      <FilterActivity
        type="all"
        onFilterChange={onFilterActivityChange}
        userActionsStats={userActionsStats}
      />
    );

    expect(screen.getByLabelText(`${userActionsStats.total} active filters`)).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        `${
          userActionsStats.totalCommentCreations - userActionsStats.totalCommentDeletions
        } available filters`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${userActionsStats.totalOtherActions} available filters`)
    ).toBeInTheDocument();
  });

  it('onChange is called with user filter type', async () => {
    renderWithTestingProviders(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    const commentsFilter = screen.getByTestId('user-actions-filter-activity-button-comments');

    await userEvent.click(commentsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('user'));
  });

  it('onChange is called with action filter type', async () => {
    renderWithTestingProviders(
      <FilterActivity type="user" onFilterChange={onFilterActivityChange} />
    );

    const actionsFilter = screen.getByTestId('user-actions-filter-activity-button-history');

    await userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('action'));
    await waitFor(() => {
      expect(
        screen
          .getByTestId('user-actions-filter-activity-button-history')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });

  it('onChange is called with all filter type', async () => {
    renderWithTestingProviders(
      <FilterActivity type="action" onFilterChange={onFilterActivityChange} />
    );

    const actionsFilter = screen.getByTestId('user-actions-filter-activity-button-all');

    await userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('all'));
    await waitFor(() => {
      expect(
        screen
          .getByTestId('user-actions-filter-activity-button-all')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });
});
