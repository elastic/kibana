/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AlertEpisodeMetadataTable } from './metadata_table';

const mockHit = { id: 'h1', raw: { _id: 'h1' }, flattened: {} } as unknown as DataTableRecord;
const mockDataView = createStubDataView({ spec: { id: 'test-*', title: 'test-*' } });

describe('AlertEpisodeMetadataTable', () => {
  it('renders the provided table render function output', () => {
    const renderTable = jest.fn(() => <div data-test-subj="mockTable" />);
    render(
      <AlertEpisodeMetadataTable
        hit={mockHit}
        dataView={mockDataView}
        renderTable={renderTable}
        isStale={false}
      />
    );
    expect(screen.getByTestId('mockTable')).toBeInTheDocument();
    expect(renderTable).toHaveBeenCalledWith({ hit: mockHit, dataView: mockDataView });
  });

  it('renders the stale-data callout when isStale is true', () => {
    render(
      <AlertEpisodeMetadataTable
        hit={mockHit}
        dataView={mockDataView}
        renderTable={() => null}
        isStale
        dataTimestamp="2026-05-05T00:00:00Z"
        dateFormat="MMM D, YYYY"
      />
    );
    expect(screen.getByTestId('alertingV2EpisodeMetadataTabStaleCallout')).toBeInTheDocument();
  });
});
