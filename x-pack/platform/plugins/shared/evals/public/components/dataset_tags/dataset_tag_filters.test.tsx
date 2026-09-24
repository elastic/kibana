/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { DatasetFacets } from '@kbn/evals-common';
import { DatasetTagFilters } from './dataset_tag_filters';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

const facets: DatasetFacets = {
  tags: [
    { value: 'golden', count: 3 },
    { value: 'esql', count: 1 },
  ],
  maturity: [{ value: 'golden', count: 2 }],
};

const renderFilters = (props: Partial<React.ComponentProps<typeof DatasetTagFilters>> = {}) => {
  const onTagsChange = jest.fn();
  const onMaturityChange = jest.fn();

  render(
    <DatasetTagFilters
      facets={facets}
      selectedTags={[]}
      selectedMaturity={[]}
      onTagsChange={onTagsChange}
      onMaturityChange={onMaturityChange}
      {...props}
    />,
    { wrapper: Wrapper }
  );

  return { onTagsChange, onMaturityChange };
};

describe('DatasetTagFilters', () => {
  it('shows how many values each filter offers', () => {
    renderFilters();

    expect(screen.getByTestId('datasetTagsFilterButton')).toHaveTextContent('2');
    expect(screen.getByTestId('datasetMaturityFilterButton')).toHaveTextContent('1');
  });

  it('lists tags with the number of datasets carrying them', async () => {
    renderFilters();

    await userEvent.click(screen.getByTestId('datasetTagsFilterButton'));

    expect(screen.getByRole('option', { name: /golden/ })).toHaveTextContent('3');
    expect(screen.getByRole('option', { name: /esql/ })).toHaveTextContent('1');
  });

  it('reports the tag selection', async () => {
    const { onTagsChange } = renderFilters();

    await userEvent.click(screen.getByTestId('datasetTagsFilterButton'));
    await userEvent.click(screen.getByRole('option', { name: /esql/ }));

    expect(onTagsChange).toHaveBeenCalledWith(['esql']);
  });

  it('adds to an existing tag selection rather than replacing it', async () => {
    const { onTagsChange } = renderFilters({ selectedTags: ['golden'] });

    await userEvent.click(screen.getByTestId('datasetTagsFilterButton'));
    await userEvent.click(screen.getByRole('option', { name: /esql/ }));

    expect(onTagsChange).toHaveBeenCalledWith(['golden', 'esql']);
  });

  it('offers only maturity levels that exist, using their display labels', async () => {
    const { onMaturityChange } = renderFilters();

    await userEvent.click(screen.getByTestId('datasetMaturityFilterButton'));

    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.click(screen.getByRole('option', { name: /Golden/ }));

    expect(onMaturityChange).toHaveBeenCalledWith(['golden']);
  });

  it('keeps a selected tag selectable once the search term filters it out of the facets', async () => {
    const { onTagsChange } = renderFilters({
      facets: { tags: [], maturity: [] },
      selectedTags: ['golden'],
    });

    await userEvent.click(screen.getByTestId('datasetTagsFilterButton'));
    const option = screen.getByRole('option', { name: /golden/ });
    expect(option).toHaveTextContent('0');

    await userEvent.click(option);

    expect(onTagsChange).toHaveBeenCalledWith([]);
  });
});
