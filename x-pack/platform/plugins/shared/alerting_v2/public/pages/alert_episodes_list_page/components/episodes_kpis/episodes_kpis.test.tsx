/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TimeRange } from '@kbn/es-query';
import type { AlertEpisodesKibanaServices } from '../../../../episodes_kibana_services';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useEpisodesKpisQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_episodes_kpis_query';
import { EpisodesKpis } from './episodes_kpis';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episodes_kpis_query');

const mockUseEpisodesKpisQuery = jest.mocked(useEpisodesKpisQuery);

const mockServices = {} as AlertEpisodesKibanaServices;
const mockFilterState: EpisodesFilterState = {};
const mockTimeRange: TimeRange = { from: 'now-24h', to: 'now' };

describe('EpisodesKpis', () => {
  it('renders loading state with skeleton stats', () => {
    mockUseEpisodesKpisQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <EpisodesKpis
        services={mockServices}
        filterState={mockFilterState}
        timeRange={mockTimeRange}
      />
    );

    // Panel titles are always visible
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Alert actions')).toBeInTheDocument();

    // Stat descriptions are always visible even during loading
    expect(screen.getByText('Alerts count')).toBeInTheDocument();
    expect(screen.getByText('Firing rules')).toBeInTheDocument();
    expect(screen.getByText('Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Unassigned alerts')).toBeInTheDocument();
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(screen.getByText('Snoozed')).toBeInTheDocument();
  });

  it('renders data when the query succeeds', () => {
    mockUseEpisodesKpisQuery.mockReturnValue({
      data: {
        alertsCount: 42,
        firingRules: 5,
        assignedToMe: 3,
        unassigned: 12,
        acknowledged: 8,
        snoozed: 2,
      },
      isLoading: false,
      isError: false,
    });

    render(
      <EpisodesKpis
        services={mockServices}
        filterState={mockFilterState}
        timeRange={mockTimeRange}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders an error message when the query fails', () => {
    mockUseEpisodesKpisQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(
      <EpisodesKpis
        services={mockServices}
        filterState={mockFilterState}
        timeRange={mockTimeRange}
      />
    );

    expect(
      screen.getByText(
        'An error occurred while fetching the alert statistics. Try refreshing the page.'
      )
    ).toBeInTheDocument();
  });

  it('passes filterState and timeRange to the hook', () => {
    mockUseEpisodesKpisQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const specificTimeRange: TimeRange = { from: 'now-7d', to: 'now' };
    const specificFilterState: EpisodesFilterState = { status: ['active'] };

    render(
      <EpisodesKpis
        services={mockServices}
        filterState={specificFilterState}
        timeRange={specificTimeRange}
      />
    );

    expect(mockUseEpisodesKpisQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filterState: specificFilterState,
        timeRange: specificTimeRange,
      })
    );
  });
});
