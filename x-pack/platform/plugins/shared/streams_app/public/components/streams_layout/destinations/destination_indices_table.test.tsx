/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { DestinationIndicesTable } from './destination_indices_table';

jest.mock('../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: (_path: string, { path }: { path: { indexName: string; tab: string } }) =>
      `/v2/indices/${path.indexName}/${path.tab}`,
    push: jest.fn(),
  }),
}));

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));

jest.mock('../../../hooks/use_unit_id', () => ({
  useUnitId: () => 'unit-1',
}));

jest.mock('./destinations_context', () => ({
  useDestinationIndexStats: () => ({ stats: undefined, status: 'ready' }),
}));

const LONG_INDEX_NAME = 'logs-a-very-long-integration-name.with-a-long-dataset-name-production';

// Plain indices have no stats, so the stat cells need none of the data stream columns' context.
const INDICES: ResolvedDestinationIndex[] = [
  { name: LONG_INDEX_NAME, is_data_stream: false },
  { name: 'logs-short', is_data_stream: false },
];

const renderTable = () =>
  render(
    <I18nProvider>
      <DestinationIndicesTable
        destinationId="es-logs"
        indices={INDICES}
        indicesStatus="ready"
        onShowDestinationDetail={jest.fn()}
        onHideDestinationDetail={jest.fn()}
      />
    </I18nProvider>
  );

describe('DestinationIndicesTable', () => {
  it('links each index by its full name', () => {
    renderTable();

    expect(
      screen.getAllByTestId('streamsDestinationIndexLink').map((link) => link.textContent)
    ).toEqual([LONG_INDEX_NAME, 'logs-short']);
  });

  it('shows the full index name in a tooltip on hover', async () => {
    renderTable();

    fireEvent.mouseOver(screen.getByRole('link', { name: LONG_INDEX_NAME }));

    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText(LONG_INDEX_NAME)).toBeTruthy();
  });
});
