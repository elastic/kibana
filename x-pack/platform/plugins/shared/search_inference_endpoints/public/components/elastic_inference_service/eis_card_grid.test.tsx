/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { GroupedModel } from '../../utils/eis_utils';
import { EisModelStatus } from '../../types';
import { EisCardGrid } from './eis_card_grid';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListItems: jest.fn(),
}));

const { useContentListItems } = jest.requireMock('@kbn/content-list-provider') as {
  useContentListItems: jest.Mock;
};

const model = (
  modelName: string,
  endOfLifeDate: string | undefined,
  modelStatus: EisModelStatus
): GroupedModel => ({
  service: 'elastic',
  modelName,
  modelCreator: 'Jina',
  modelStatus,
  taskTypes: ['text_embedding'],
  categories: ['Embedding'],
  endpoints: [],
  ...(endOfLifeDate && {
    modelMetadata: { heuristics: { end_of_life_date: endOfLifeDate } },
  }),
});

const itemFor = (grouped: GroupedModel) => ({
  id: grouped.modelName,
  title: grouped.modelName,
  model: grouped,
  modelId: grouped.modelName,
});

const renderGrid = () =>
  render(
    <EuiThemeProvider>
      <EisCardGrid onViewModelDetails={jest.fn()} />
    </EuiThemeProvider>
  );

describe('EisCardGrid', () => {
  it('renders every model in one grid', () => {
    useContentListItems.mockReturnValue({
      items: [
        itemFor(model('Current', '2026-06-01', EisModelStatus.GA)),
        itemFor(model('Soon', '2026-03-10', EisModelStatus.Deprecated)),
        itemFor({
          ...model('Later', '2026-08-01', EisModelStatus.Deprecated),
          modelMetadata: {
            heuristics: { status: 'deprecated', end_of_life_date: '2026-08-01' },
          },
        }),
        itemFor(model('Retired', '2026-02-01', EisModelStatus.DeprecatedEOL)),
      ],
    });

    const { getByTestId, queryByTestId } = renderGrid();

    expect(queryByTestId('eisModelCardsNearingEndOfLife')).not.toBeInTheDocument();
    expect(queryByTestId('eisModelCardsEndOfLife')).not.toBeInTheDocument();
    expect(getByTestId('eisModelCard-Current')).toBeInTheDocument();
    expect(getByTestId('eisModelCard-Soon')).toBeInTheDocument();
    expect(getByTestId('eisModelCard-Later')).toBeInTheDocument();
    expect(getByTestId('eisModelCard-Retired')).toBeInTheDocument();
  });
});
