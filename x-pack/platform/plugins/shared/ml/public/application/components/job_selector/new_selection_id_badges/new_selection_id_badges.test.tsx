/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { NewSelectionIdBadgesProps } from './new_selection_id_badges';
import { NewSelectionIdBadges } from './new_selection_id_badges';

jest.mock('../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      share: {},
      application: {
        navigateToUrl: jest.fn(),
      },
    },
  }),
}));

const props: NewSelectionIdBadgesProps = {
  limit: 2,
  groups: [
    {
      id: 'group1',
      jobIds: ['job1', 'job2'],
      timeRange: {
        from: 0,
        to: 0,
        fromPx: 0,
        toPx: 0,
        fromMoment: null,
        toMoment: null,
        widthPx: 0,
      },
    },
    {
      id: 'group2',
      jobIds: ['job3', 'job4'],
      timeRange: {
        from: 0,
        to: 0,
        fromPx: 0,
        toPx: 0,
        fromMoment: null,
        toMoment: null,
        widthPx: 0,
      },
    },
  ],
  onLinkClick: jest.fn(),
  onDeleteClick: jest.fn(),
  newSelection: ['group1', 'job1', 'job3'],
  showAllBadges: false,
};

describe('NewSelectionIdBadges', () => {
  describe('showAllBarBadges is false', () => {
    test('shows link to show more badges if selection is over limit', () => {
      const { getByText } = render(<NewSelectionIdBadges {...props} />);
      const showMoreLink = getByText('And 1 more');
      expect(showMoreLink).toBeDefined();
    });

    test('does not show link to show more badges if selection is within limit', () => {
      const underLimitProps = { ...props, newSelection: ['group1', 'job1'] };
      const { queryByText } = render(<NewSelectionIdBadges {...underLimitProps} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();
    });
  });

  describe('showAllBarBadges is true', () => {
    const showAllTrueProps = {
      ...props,
      showAllBadges: true,
    };

    test('shows all badges when selection is over limit', () => {
      const { getByText } = render(<NewSelectionIdBadges {...showAllTrueProps} />);
      const group1 = getByText(/group1/);
      const job1 = getByText(/job1/);
      const job3 = getByText(/job3/);
      expect(group1).toBeDefined();
      expect(job1).toBeDefined();
      expect(job3).toBeDefined();
    });

    test('shows hide link when selection is over limit', () => {
      const { getByText, queryByText } = render(<NewSelectionIdBadges {...showAllTrueProps} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();

      const hideLink = getByText('Hide');
      expect(hideLink).toBeDefined();
    });
  });
});
