/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import * as api from '../../api';
import { renderWithTestingProviders } from '../../common/mock';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { basicCaseSnake } from '../../containers/mock';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import { MergedIntoBadge } from './merged_into_badge';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const useCaseViewNavigationMock = jest.mocked(useCaseViewNavigation);

const destination = { id: 'destination-id', title: 'Phishing campaign', incrementalId: 142 };
const laterDestination = {
  id: 'later-destination-id',
  title: 'Phishing wave',
  incrementalId: null,
};
const destinations = new Map<string, MergeCaseSnapshot>([
  [destination.id, destination],
  [laterDestination.id, laterDestination],
]);

const mergedInto = (ids: string[]) => ({
  mergedInto: ids,
  mergedAt: '2024-01-01T00:00:00.000Z',
  closedByMerge: true,
});

describe('MergedIntoBadge', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({
      navigateToCaseView: jest.fn(),
      getCaseViewUrl: jest.fn(({ detailName }) => `/cases/${detailName}`),
    });
  });

  it('names the destination by number and links to it, without fetching', () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases');

    renderWithTestingProviders(
      <MergedIntoBadge merge={mergedInto([destination.id])} destinations={destinations} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent(/^Merged into #142$/);
    expect(screen.getByTestId('case-details-link')).toHaveAttribute(
      'href',
      '/cases/destination-id'
    );
    expect(bulkGetCases).not.toHaveBeenCalled();
  });

  it('shows the latest destination, by title until it has a number', () => {
    renderWithTestingProviders(
      <MergedIntoBadge
        merge={mergedInto([destination.id, laterDestination.id])}
        destinations={destinations}
      />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent(
      /^Merged into Phishing wave$/
    );
  });

  it('fetches the destination when none is given', async () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases').mockResolvedValue({
      cases: [
        { ...basicCaseSnake, id: destination.id, title: destination.title, incremental_id: 142 },
      ],
      errors: [],
    });

    renderWithTestingProviders(<MergedIntoBadge merge={mergedInto([destination.id])} />);

    expect(await screen.findByText('Merged into #142')).toBeInTheDocument();
    expect(bulkGetCases).toHaveBeenCalledWith(
      expect.objectContaining({ params: { ids: [destination.id] } })
    );
  });

  it('reads "Merged" until the destination loads', () => {
    renderWithTestingProviders(
      <MergedIntoBadge merge={mergedInto(['unknown'])} destinations={destinations} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent(/^Merged$/);
  });

  it('renders nothing for a case that was never merged', () => {
    renderWithTestingProviders(<MergedIntoBadge merge={null} destinations={destinations} />);

    expect(screen.queryByTestId('case-merged-into-badge')).not.toBeInTheDocument();
  });
});
