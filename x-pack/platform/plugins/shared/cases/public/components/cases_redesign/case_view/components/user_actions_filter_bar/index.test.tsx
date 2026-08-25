/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import { renderWithTestingProviders } from '../../../../../common/mock';
import { getCaseUsersMockResponse } from '../../../../../containers/mock';
import { useGetCaseUsers } from '../../../../../containers/use_get_case_users';
import type { UserActivityParams } from '../../../../user_actions_activity_bar/types';
import type { CaseUserActionsStats } from '../../../../../containers/types';
import { UserActionsFilterBar } from '.';

jest.mock('../../../../../containers/use_get_case_users');

const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;

const userActionsStats: CaseUserActionsStats = {
  total: 21,
  totalDeletions: 0,
  totalComments: 9,
  totalCommentDeletions: 0,
  totalCommentCreations: 9,
  totalHiddenCommentUpdates: 0,
  totalOtherActions: 11,
  totalOtherActionDeletions: 0,
};

const defaultParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

describe('UserActionsFilterBar', () => {
  const onParamsChange = jest.fn();
  const caseUsers = getCaseUsersMockResponse();
  // eslint-disable-next-line prefer-object-spread
  const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

  beforeAll(() => {
    // EUI popovers rely on real CSS transitions/animations to know when
    // they've finished opening; jsdom's default `getComputedStyle` stub
    // doesn't reflect that, which leaves the panel's `pointer-events: none`
    // in place and breaks `userEvent` clicks on its contents.
    Object.defineProperty(window, 'getComputedStyle', {
      value: (el: HTMLElement) => {
        const declaration = new CSSStyleDeclaration();
        const { style } = el;

        Array.prototype.forEach.call(style, (property: string) => {
          declaration.setProperty(
            property,
            style.getPropertyValue(property),
            style.getPropertyPriority(property)
          );
        });

        return declaration;
      },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
  });

  const renderBar = (params: UserActivityParams = defaultParams) =>
    renderWithTestingProviders(
      <UserActionsFilterBar
        caseId="case-1"
        params={params}
        userActionsStats={userActionsStats}
        onParamsChange={onParamsChange}
      />
    );

  it('renders the search input and filter group', () => {
    renderBar();

    expect(screen.getByTestId('user-actions-filter-bar-search')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-bar-filter-group')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-bar-type-button')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-bar-author-button')).toBeInTheDocument();
    expect(screen.getByTestId('user-actions-filter-bar-sort-button')).toBeInTheDocument();
  });

  it('applies a search term when pressing Enter', async () => {
    renderBar();

    await userEvent.type(screen.getByTestId('user-actions-filter-bar-search'), 'root cause{Enter}');

    expect(onParamsChange).toHaveBeenCalledWith({ ...defaultParams, search: 'root cause' });
  });

  it('trims the search term before applying it', async () => {
    renderBar();

    await userEvent.type(
      screen.getByTestId('user-actions-filter-bar-search'),
      '  root cause  {Enter}'
    );

    expect(onParamsChange).toHaveBeenCalledWith({ ...defaultParams, search: 'root cause' });
  });

  it('applies an empty search when the field is blurred after clearing an applied search', async () => {
    renderBar({ ...defaultParams, search: 'root cause' });

    const searchInput = screen.getByTestId('user-actions-filter-bar-search');
    await userEvent.clear(searchInput);
    await userEvent.tab();

    expect(onParamsChange).toHaveBeenCalledWith({
      ...defaultParams,
      search: undefined,
    });
  });

  it('does not call onParamsChange on blur when no search was ever applied', async () => {
    renderBar();

    const searchInput = screen.getByTestId('user-actions-filter-bar-search');
    await userEvent.click(searchInput);
    await userEvent.tab();

    expect(onParamsChange).not.toHaveBeenCalled();
  });

  it('changes the type filter', async () => {
    renderBar();

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-type-button'));
    await userEvent.click(await screen.findByTestId('user-actions-filter-bar-type-option-history'));

    expect(onParamsChange).toHaveBeenCalledWith({ ...defaultParams, type: 'action' });
  });

  it('changes the sort order', async () => {
    renderBar();

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-sort-button'));
    await userEvent.click(await screen.findByTestId('user-actions-filter-bar-sort-option-desc'));

    expect(onParamsChange).toHaveBeenCalledWith({ ...defaultParams, sortOrder: 'desc' });
  });

  it('changes the author filter to a single selected participant', async () => {
    renderBar();

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-author-button'));
    await userEvent.click(
      await screen.findByTestId('user-actions-filter-bar-author-option-participant_1')
    );

    expect(onParamsChange).toHaveBeenCalledWith({
      ...defaultParams,
      authors: ['participant_1'],
    });
  });

  it('adds a second author to an already selected author', async () => {
    renderBar({ ...defaultParams, authors: ['participant_1'] });

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-author-button'));
    await userEvent.click(
      await screen.findByTestId('user-actions-filter-bar-author-option-participant_2')
    );

    expect(onParamsChange).toHaveBeenCalledWith({
      ...defaultParams,
      authors: ['participant_1', 'participant_2'],
    });
  });

  it('removes one of several selected authors while keeping the others', async () => {
    renderBar({ ...defaultParams, authors: ['participant_1', 'participant_2'] });

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-author-button'));
    await userEvent.click(
      await screen.findByTestId('user-actions-filter-bar-author-option-participant_1')
    );

    expect(onParamsChange).toHaveBeenCalledWith({
      ...defaultParams,
      authors: ['participant_2'],
    });
  });

  it('resets the author filter back to "All" when the only selected author is deselected', async () => {
    renderBar({ ...defaultParams, authors: ['participant_1'] });

    await userEvent.click(screen.getByTestId('user-actions-filter-bar-author-button'));
    await userEvent.click(
      await screen.findByTestId('user-actions-filter-bar-author-option-participant_1')
    );

    expect(onParamsChange).toHaveBeenCalledWith({
      ...defaultParams,
      authors: undefined,
    });
  });

  describe('clear filters', () => {
    it('is not rendered when no filter is active', () => {
      renderBar();

      expect(screen.queryByTestId('user-actions-filter-bar-clear-filters')).not.toBeInTheDocument();
    });

    it('is rendered when a filter is applied', () => {
      renderBar({ ...defaultParams, type: 'action' });

      expect(screen.getByTestId('user-actions-filter-bar-clear-filters')).toBeInTheDocument();
    });

    it('stays hidden while typing an unsubmitted search term', async () => {
      renderBar();

      expect(screen.queryByTestId('user-actions-filter-bar-clear-filters')).not.toBeInTheDocument();

      // Applied filter state (params.search) is what drives "Clear filters",
      // not the raw input buffer -- typing alone shouldn't change it.
      await userEvent.type(screen.getByTestId('user-actions-filter-bar-search'), 'partial');

      expect(screen.queryByTestId('user-actions-filter-bar-clear-filters')).not.toBeInTheDocument();
    });

    it('stays visible while backspacing an applied search term without blurring', async () => {
      renderBar({ ...defaultParams, search: 'root cause' });

      expect(screen.getByTestId('user-actions-filter-bar-clear-filters')).toBeInTheDocument();

      // Regression test: backspacing the input to empty (without blurring)
      // must not hide "Clear filters", since `params.search` is still
      // applied and actively driving the rendered results at this point.
      await userEvent.clear(screen.getByTestId('user-actions-filter-bar-search'));

      expect(screen.getByTestId('user-actions-filter-bar-clear-filters')).toBeInTheDocument();
    });

    it('resets type, authors, and search when clicked', async () => {
      renderBar({
        ...defaultParams,
        type: 'action',
        authors: ['participant_1'],
        search: 'foo',
      });

      await userEvent.click(screen.getByTestId('user-actions-filter-bar-clear-filters'));

      expect(onParamsChange).toHaveBeenCalledWith({
        ...defaultParams,
        type: 'all',
        authors: undefined,
        search: undefined,
      });
    });

    it('clears the search input value when clicked', async () => {
      renderBar({ ...defaultParams, search: 'foo' });

      await userEvent.click(screen.getByTestId('user-actions-filter-bar-clear-filters'));

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-filter-bar-search')).toHaveValue('');
      });
    });
  });
});
