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

const mockRouterLink = jest.fn((..._args: unknown[]) => '/app/streams/v2/unit/unit-1/map');
const mockRouterPush = jest.fn();
jest.mock('../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({ link: mockRouterLink, push: mockRouterPush }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));
jest.mock('../../../hooks/use_unit_id', () => ({
  useUnitId: () => 'unit-1',
}));

const mapRoute = [
  '/v2/unit/{unitId}/{tab}',
  { path: { unitId: 'unit-1', tab: 'map' }, query: { rangeFrom: 'now-15m', rangeTo: 'now' } },
] as const;

const renderWithoutIndices = ({
  hasConnectedSource,
  showMapLink,
}: {
  hasConnectedSource: boolean;
  showMapLink?: boolean;
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
        showMapLink={showMapLink}
      />
    </I18nProvider>
  );

describe('DestinationIndicesTable without indices', () => {
  beforeEach(() => {
    mockRouterLink.mockClear();
    mockRouterPush.mockClear();
  });

  it('keeps the write scope text when a source is connected', () => {
    renderWithoutIndices({ hasConnectedSource: true, showMapLink: true });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      "No indices match this destination's write scope yet."
    );
    expect(screen.queryByTestId('streamsDestinationIndicesMapLink')).not.toBeInTheDocument();
  });

  it('says no sources are connected and links to the whole Map', () => {
    renderWithoutIndices({ hasConnectedSource: false, showMapLink: true });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      'No sources are connected to this destination yet. Connect one on the Map to start sending data.'
    );
    const link = screen.getByTestId('streamsDestinationIndicesMapLink');
    expect(link).toBe(screen.getByRole('link', { name: 'the Map' }));
    expect(link).toHaveAttribute('href', '/app/streams/v2/unit/unit-1/map');
    expect(mockRouterLink).toHaveBeenCalledWith(...mapRoute);
  });

  it('opens the Map in the app on a plain click', () => {
    renderWithoutIndices({ hasConnectedSource: false, showMapLink: true });

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'the Map' }));

    expect(notPrevented).toBe(false);
    expect(mockRouterPush).toHaveBeenCalledWith(...mapRoute);
  });

  it('says no sources are connected without a link when the Map link is off', () => {
    renderWithoutIndices({ hasConnectedSource: false });

    expect(screen.getByTestId('streamsDestinationIndicesEmpty')).toHaveTextContent(
      'No sources are connected to this destination yet. Connect one to start sending data.'
    );
    expect(screen.queryByTestId('streamsDestinationIndicesMapLink')).not.toBeInTheDocument();
  });
});
