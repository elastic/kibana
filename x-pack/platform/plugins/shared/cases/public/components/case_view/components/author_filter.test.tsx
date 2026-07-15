/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthorFilter } from './author_filter';
import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase, alertComment, elasticUser } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';

// Build a second author so the filter has > 1 option.
const otherUser = { fullName: 'April Ludgate', username: 'aludgate', email: 'april@elastic.co' };
const otherUserAlert = {
  ...alertComment,
  id: 'alert-other',
  createdBy: otherUser,
};

const caseWithTwoAuthors: CaseUI = {
  ...basicCase,
  // basicCase already has a user comment created by `elasticUser`.
  comments: [...basicCase.comments, otherUserAlert],
};

describe('AuthorFilter', () => {
  const onAuthorsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', () => {
    renderWithTestingProviders(
      <AuthorFilter
        caseData={caseWithTwoAuthors}
        selectedAuthors={[]}
        onAuthorsChange={onAuthorsChange}
      />
    );

    expect(screen.getByTestId('options-filter-popover-button-author')).toBeInTheDocument();
  });

  it('lists every unique attachment author, sorted by display name', async () => {
    renderWithTestingProviders(
      <AuthorFilter
        caseData={caseWithTwoAuthors}
        selectedAuthors={[]}
        onAuthorsChange={onAuthorsChange}
      />
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-author'));

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    // "April Ludgate" < "Leslie Knope" alphabetically.
    expect(options[0]).toHaveAttribute(
      'data-test-subj',
      `options-filter-popover-item-${otherUser.username}`
    );
    expect(options[1]).toHaveAttribute(
      'data-test-subj',
      `options-filter-popover-item-${elasticUser.username}`
    );
  });

  it('omits authors with no usable identity from the dropdown', async () => {
    const caseWithUnknown: CaseUI = {
      ...basicCase,
      comments: [
        ...basicCase.comments,
        {
          ...alertComment,
          id: 'a-unknown',
          createdBy: { fullName: null, username: null, email: null },
        },
      ],
    };

    renderWithTestingProviders(
      <AuthorFilter
        caseData={caseWithUnknown}
        selectedAuthors={[]}
        onAuthorsChange={onAuthorsChange}
      />
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-author'));

    // Only the known author shows up; the unidentified one is dropped.
    expect(await screen.findAllByRole('option')).toHaveLength(1);
    expect(
      screen.getByTestId(`options-filter-popover-item-${elasticUser.username}`)
    ).toBeInTheDocument();
  });

  it('deduplicates authors that share the same key across multiple comments', async () => {
    const caseWithDuplicates: CaseUI = {
      ...basicCase,
      comments: [
        ...basicCase.comments,
        { ...alertComment, id: 'a-2' },
        { ...alertComment, id: 'a-3' },
      ],
    };

    renderWithTestingProviders(
      <AuthorFilter
        caseData={caseWithDuplicates}
        selectedAuthors={[]}
        onAuthorsChange={onAuthorsChange}
      />
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-author'));

    expect(await screen.findAllByRole('option')).toHaveLength(1);
  });

  it('calls onAuthorsChange with the selected key when toggled on', async () => {
    renderWithTestingProviders(
      <AuthorFilter
        caseData={caseWithTwoAuthors}
        selectedAuthors={[]}
        onAuthorsChange={onAuthorsChange}
      />
    );

    await userEvent.click(screen.getByTestId('options-filter-popover-button-author'));
    await userEvent.click(
      await screen.findByTestId(`options-filter-popover-item-${otherUser.username}`)
    );

    await waitFor(() => {
      expect(onAuthorsChange).toHaveBeenCalledWith([otherUser.username]);
    });
  });
});
