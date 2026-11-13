/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../api';
import { renderWithTestingProviders } from '../../common/mock';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { basicCaseSnake } from '../../containers/mock';
import { MergedIntoBadge } from './merged_into_badge';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const useCaseViewNavigationMock = jest.mocked(useCaseViewNavigation);

const destination = { id: 'destination-id', title: 'Phishing campaign', incrementalId: 142 };
const destinations = new Map([[destination.id, destination]]);

describe('MergedIntoBadge', () => {
  const navigateToCaseView = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView, getCaseViewUrl: jest.fn() });
  });

  it('uses the destinations it is given without fetching', () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases');

    renderWithTestingProviders(
      <MergedIntoBadge destinationId={destination.id} destinations={destinations} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged into #142');
    expect(bulkGetCases).not.toHaveBeenCalled();
  });

  it('fetches its destination when none are given', async () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases').mockResolvedValue({
      cases: [
        { ...basicCaseSnake, id: destination.id, title: destination.title, incremental_id: 142 },
      ],
      errors: [],
    });

    renderWithTestingProviders(<MergedIntoBadge destinationId={destination.id} />);

    expect(await screen.findByText('Merged into #142')).toBeInTheDocument();
    expect(bulkGetCases).toHaveBeenCalledWith(
      expect.objectContaining({ params: { ids: [destination.id] } })
    );
  });

  it('shows a plain label when the destination cannot be read', () => {
    renderWithTestingProviders(
      <MergedIntoBadge destinationId={destination.id} destinations={new Map()} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the destination when clicked', async () => {
    renderWithTestingProviders(
      <MergedIntoBadge destinationId={destination.id} destinations={destinations} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open case #142' }));

    expect(navigateToCaseView).toHaveBeenCalledWith({ detailName: destination.id });
  });

  it('is not interactive when it sits inside another link', () => {
    renderWithTestingProviders(
      <MergedIntoBadge destinationId={destination.id} destinations={destinations} isLink={false} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged into #142');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
