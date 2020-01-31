/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { cleanup, render } from 'react-testing-library';
import { IdBadges } from './id_badges';

const props = {
  limit: 2,
  maps: {
    groupsMap: {
      group1: ['job1', 'job2'],
      group2: ['job3'],
    },
    jobsMap: {
      job1: ['group1'],
      job2: ['group1'],
      job3: ['group2'],
      job4: [],
    },
  },
  onLinkClick: jest.fn(),
  selectedIds: ['group1', 'job1', 'job3'],
  showAllBarBadges: false,
};

const overLimitProps = { ...props, selectedIds: ['group1', 'job1', 'job3', 'job4'] };

describe('IdBadges', () => {
  afterEach(cleanup);

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
    const overLimitShowAllProps = {
      ...props,
      showAllBarBadges: true,
      selectedIds: ['group1', 'job1', 'job3', 'job4'],
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
