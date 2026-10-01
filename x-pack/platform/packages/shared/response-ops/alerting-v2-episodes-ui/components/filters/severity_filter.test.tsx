/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertEpisodesSeverityFilter } from './severity_filter';
import { EpisodeDataSourceProvider } from '../../context/episode_data_source_context';
import { createTestEpisodeSource } from '../../types/episode_data_source.mock';
import { CLASSIC_SEVERITY_EXTENSIONS } from '../../classic_alerts/create_classic_episode_source';

const renderFilter = (
  props: Partial<React.ComponentProps<typeof AlertEpisodesSeverityFilter>> = {},
  withExtensions = false
) => {
  const dataSource = withExtensions
    ? createTestEpisodeSource({
        severityExtensions: CLASSIC_SEVERITY_EXTENSIONS,
      })
    : undefined;

  return render(
    <EpisodeDataSourceProvider dataSource={dataSource}>
      <AlertEpisodesSeverityFilter
        selectedSeverities={null}
        onSeveritiesChange={jest.fn()}
        data-test-subj="test-severity-filter"
        {...props}
      />
    </EpisodeDataSourceProvider>
  );
};

describe('AlertEpisodesSeverityFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter button with correct label', () => {
    renderFilter();
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('shows hasActiveFilters when severities are selected', () => {
    renderFilter({ selectedSeverities: ['high'] });
    const button = screen.getByTestId('test-severity-filter-button');
    expect(button).toHaveClass('euiFilterButton-hasActiveFilters');
  });

  it('includes extension severity options when data source has severityExtensions', () => {
    renderFilter({}, true);
    fireEvent.click(screen.getByTestId('test-severity-filter-button'));

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Minor')).toBeInTheDocument();
    expect(screen.getByText('Major')).toBeInTheDocument();
  });

  it('emits extension severity values when selected', () => {
    const onSeveritiesChange = jest.fn();
    renderFilter({ onSeveritiesChange }, true);
    fireEvent.click(screen.getByTestId('test-severity-filter-button'));
    fireEvent.click(screen.getByTestId('test-severity-filter-popover-option-warning'));

    expect(onSeveritiesChange).toHaveBeenCalledWith(['warning']);
  });
});
