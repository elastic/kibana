/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusStats } from './status_stats';

describe('Stats', () => {
  const defaultProps = {
    caseStatus: CaseStatuses.open,
    caseCount: 2,
    isLoading: false,
    dataTestSubj: 'test-stats',
  };

  it('it renders', async () => {
    render(<StatusStats {...defaultProps} />);

    expect(screen.getByTestId('test-stats')).toBeInTheDocument();
  });

  it('shows the count', async () => {
    render(<StatusStats {...defaultProps} />);

    expect(within(screen.getByTestId('test-stats')).getByText('2')).toBeInTheDocument();
  });

  it('shows the loading spinner', async () => {
    render(<StatusStats {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('test-stats-loading-spinner')).toBeInTheDocument();
  });

  describe('Status title', () => {
    it('shows the correct description for status open', async () => {
      render(<StatusStats {...defaultProps} />);

      expect(within(screen.getByTestId('test-stats')).getByText('Open cases')).toBeInTheDocument();
    });

    it('shows the correct description for status in-progress', async () => {
      render(<StatusStats {...defaultProps} caseStatus={CaseStatuses['in-progress']} />);

      expect(
        within(screen.getByTestId('test-stats')).getByText('In progress cases')
      ).toBeInTheDocument();
    });

    it('shows the correct description for status closed', async () => {
      render(<StatusStats {...defaultProps} caseStatus={CaseStatuses.closed} />);

      expect(
        within(screen.getByTestId('test-stats')).getByText('Closed cases')
      ).toBeInTheDocument();
    });
  });
});
