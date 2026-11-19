/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DestinationIndicesTable } from './destination_indices_table';

jest.mock('../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({ link: () => '', push: jest.fn() }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));
jest.mock('../../../hooks/use_unit_id', () => ({
  useUnitId: () => 'unit-1',
}));
const mockNavigateToCanvasSearch = jest.fn();
jest.mock(
  '../../stream_management/data_management/stream_detail_canvas/use_navigate_to_canvas_search',
  () => ({
    useCanvasSearchHref: (query: string) => `#/map?search=${query}`,
    useNavigateToCanvasSearch: () => mockNavigateToCanvasSearch,
  })
);

const renderWithoutIndices = ({
  hasConnectedSource,
  mapSearchQuery,
}: {
  hasConnectedSource: boolean;
  mapSearchQuery?: string;
}) =>
  render(
    <I18nProvider>
      <DestinationIndicesTable
        destinationId="es-logs"
        indices={[]}
        indicesStatus="ready"
        onShowDestinationDetail={jest.fn()}
        onHideDestinationDetail={jest.fn()}
        hasConnectedSource={hasConnectedSource}
        mapSearchQuery={mapSearchQuery}
      />
    </I18nProvider>
  );

describe('DestinationIndicesTable without indices', () => {
  beforeEach(() => {
    mockNavigateToCanvasSearch.mockClear();
  });

  it('keeps the write scope text when a source is connected', () => {
    renderWithoutIndices({ hasConnectedSource: true, mapSearchQuery: 'Prod logs' });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      "No indices match this destination's write scope yet."
    );
    expect(screen.queryByTestId('streamsDestinationIndicesShowOnMapLink')).not.toBeInTheDocument();
  });

  it('says no sources are connected and links to the Map searched for the destination', () => {
    renderWithoutIndices({ hasConnectedSource: false, mapSearchQuery: 'Prod logs' });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      'No sources are connected to this destination yet. Connect one on the Map to start sending data.'
    );
    const link = screen.getByTestId('streamsDestinationIndicesShowOnMapLink');
    expect(link).toBe(screen.getByRole('link', { name: 'the Map' }));
    expect(link).toHaveAttribute('href', '#/map?search=Prod logs');
  });

  it('opens the Map in the app on a plain click', () => {
    renderWithoutIndices({ hasConnectedSource: false, mapSearchQuery: 'Prod logs' });

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'the Map' }));

    expect(notPrevented).toBe(false);
    expect(mockNavigateToCanvasSearch).toHaveBeenCalledWith('Prod logs');
  });

  it('says no sources are connected without a link when there is no Map search', () => {
    renderWithoutIndices({ hasConnectedSource: false });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      'No sources are connected to this destination yet. Connect one to start sending data.'
    );
    expect(screen.queryByTestId('streamsDestinationIndicesShowOnMapLink')).not.toBeInTheDocument();
  });
});
