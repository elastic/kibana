/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
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
const laterDestination = { id: 'later-destination-id', title: 'Phishing wave', incrementalId: 150 };
const destinations = new Map([
  [destination.id, destination],
  [laterDestination.id, laterDestination],
]);

describe('MergedIntoBadge', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({
      navigateToCaseView: jest.fn(),
      getCaseViewUrl: jest.fn(({ detailName }) => `/cases/${detailName}`),
    });
  });

  it('uses the destinations it is given without fetching', () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases');

    renderWithTestingProviders(
      <MergedIntoBadge destinationIds={[destination.id]} destinations={destinations} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent(/^Merged into 1 case$/);
    expect(bulkGetCases).not.toHaveBeenCalled();
  });

  it('fetches its destinations when none are given', async () => {
    const bulkGetCases = jest.spyOn(api, 'bulkGetCases').mockResolvedValue({
      cases: [
        { ...basicCaseSnake, id: destination.id, title: destination.title, incremental_id: 142 },
      ],
      errors: [],
    });

    renderWithTestingProviders(<MergedIntoBadge destinationIds={[destination.id]} />);

    expect(
      await screen.findByRole('link', { name: 'Open case #142 in a new tab' })
    ).toBeInTheDocument();
    expect(bulkGetCases).toHaveBeenCalledWith(
      expect.objectContaining({ params: { ids: [destination.id] } })
    );
  });

  it('is not interactive when the destination cannot be read', () => {
    renderWithTestingProviders(
      <MergedIntoBadge destinationIds={[destination.id]} destinations={new Map()} />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged into 1 case');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens the destination in a new tab', () => {
    renderWithTestingProviders(
      <MergedIntoBadge destinationIds={[destination.id]} destinations={destinations} />
    );

    const link = screen.getByRole('link', { name: 'Open case #142 in a new tab' });
    expect(link).toHaveAttribute('href', `/cases/${destination.id}`);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('counts the destinations and lists them when clicked', async () => {
    renderWithTestingProviders(
      <MergedIntoBadge
        destinationIds={[destination.id, laterDestination.id]}
        destinations={destinations}
      />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged into 2 cases');

    await userEvent.click(screen.getByRole('button', { name: 'Cases this case was merged into' }));

    const list = await screen.findByTestId('case-merged-into-destinations');
    expect(list).toHaveTextContent('#142');
    expect(list).toHaveTextContent('#150');
    for (const link of within(list).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('is not interactive when it sits inside another link', () => {
    renderWithTestingProviders(
      <MergedIntoBadge
        destinationIds={[destination.id, laterDestination.id]}
        destinations={destinations}
        isLink={false}
      />
    );

    expect(screen.getByTestId('case-merged-into-badge')).toHaveTextContent('Merged into 2 cases');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
