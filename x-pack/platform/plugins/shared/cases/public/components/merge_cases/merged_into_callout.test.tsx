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
import { MergedIntoCallout } from './merged_into_callout';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const useCaseViewNavigationMock = jest.mocked(useCaseViewNavigation);

const destinationCase = (id: string, title: string, incrementalId: number) => ({
  ...basicCaseSnake,
  id,
  title,
  incremental_id: incrementalId,
});

describe('MergedIntoCallout', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({
      navigateToCaseView: jest.fn(),
      getCaseViewUrl: jest.fn(({ detailName }) => `/cases/${detailName}`),
    });
  });

  it('points to the one case this case was merged into', async () => {
    jest.spyOn(api, 'bulkGetCases').mockResolvedValue({
      cases: [destinationCase('destination-1', 'Phishing campaign', 142)],
      errors: [],
    });

    renderWithTestingProviders(<MergedIntoCallout destinationIds={['destination-1']} />);

    expect(await screen.findByTestId('case-merged-into-callout')).toHaveTextContent(
      'Merged into #142: Phishing campaign'
    );
    const openCase = screen.getByTestId('case-merged-into-callout-open-case');
    expect(openCase).toHaveTextContent('Open case #142');
    expect(openCase).toHaveAttribute('href', '/cases/destination-1');
    expect(openCase).toHaveAttribute('target', '_blank');
  });

  it('lists every case this case was merged into and counts the ones the user cannot open', async () => {
    jest.spyOn(api, 'bulkGetCases').mockResolvedValue({
      cases: [
        destinationCase('destination-1', 'Phishing campaign', 142),
        destinationCase('destination-2', 'Phishing wave', 150),
      ],
      errors: [],
    });

    renderWithTestingProviders(
      <MergedIntoCallout destinationIds={['destination-1', 'destination-2', 'destination-3']} />
    );

    const callout = await screen.findByTestId('case-merged-into-callout');
    expect(callout).toHaveTextContent('Merged into 3 cases');
    expect(screen.getByTestId('case-merged-into-callout-destinations')).toHaveTextContent(
      '#142: Phishing campaign#150: Phishing wave'
    );
    expect(callout).toHaveTextContent("You don't have access to 1 of them.");
    expect(screen.queryByTestId('case-merged-into-callout-open-case')).not.toBeInTheDocument();
  });

  it('says the case was merged when the user cannot open any of the cases', async () => {
    jest.spyOn(api, 'bulkGetCases').mockResolvedValue({ cases: [], errors: [] });

    renderWithTestingProviders(
      <MergedIntoCallout destinationIds={['destination-1', 'destination-2']} />
    );

    expect(await screen.findByTestId('case-merged-into-callout')).toHaveTextContent(
      'Merged into 2 other cases'
    );
  });
});
