/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { IdBadgesProps } from './id_badges';
import { IdBadges } from './id_badges';

const props: IdBadgesProps = {
  limit: 2,
  selectedGroups: [
    {
      groupId: 'group1',
      jobIds: ['job1', 'job2'],
    },
    {
      groupId: 'group2',
      jobIds: ['job3'],
    },
  ],
  selectedJobIds: ['job1', 'job2', 'job3'],
  onLinkClick: jest.fn(),
  showAllBarBadges: false,
};

const overLimitProps: IdBadgesProps = { ...props, selectedJobIds: ['job4'] };

describe('IdBadges', () => {
  test('When group selected renders groupId and not corresponding jobIds', () => {
    const { getByText, queryByText } = render(<IdBadges {...props} />);
    // group1 badge should be present
    const groupId = getByText(/group1/);
    expect(groupId).toBeDefined();
    // job1 is in group1 so it should not show up since group1 is selected
    const jobId = queryByText(/job1/);
    expect(jobId).toBeNull();
  });

  describe('showAllBarBadges is false', () => {
    test('shows link to show more badges if selection is over limit', () => {
      const { getByText } = render(<IdBadges {...overLimitProps} />);
      const showMoreLink = getByText('And 1 more');
      expect(showMoreLink).toBeDefined();
    });

    test('does not show link to show more badges if selection is under limit', () => {
      const { queryByText } = render(<IdBadges {...props} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();
    });
  });

  describe('showAllBarBadges is true', () => {
    const overLimitShowAllProps: IdBadgesProps = {
      ...props,
      showAllBarBadges: true,
      selectedGroups: [
        {
          groupId: 'group1',
          jobIds: ['job1', 'job2'],
        },
      ],
      selectedJobIds: ['job3', 'job4'],
    };

    test('shows all badges when selection is over limit', () => {
      const { getByText } = render(<IdBadges {...overLimitShowAllProps} />);
      const group1 = getByText(/group1/);
      const job3 = getByText(/job3/);
      const job4 = getByText(/job4/);
      expect(group1).toBeDefined();
      expect(job3).toBeDefined();
      expect(job4).toBeDefined();
    });

    test('shows hide link when selection is over limit', () => {
      const { getByText, queryByText } = render(<IdBadges {...overLimitShowAllProps} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();

      const hideLink = getByText('Hide');
      expect(hideLink).toBeDefined();
    });
  });
});
