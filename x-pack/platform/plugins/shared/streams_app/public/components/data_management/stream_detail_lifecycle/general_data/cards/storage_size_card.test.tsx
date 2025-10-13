/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { StorageSizeCard } from './storage_size_card';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

describe('StorageSizeCard', () => {
  const createMockDefinition = (
    privileges: any = { monitor: true }
  ): Streams.ingest.all.GetResponse =>
    ({
      privileges,
    } as any);

  const createMockStats = (overrides: Partial<DataStreamStats> = {}): DataStreamStats => ({
    sizeBytes: 1000000, // 1MB
    totalDocs: 1000,
    bytesPerDoc: 1000,
    bytesPerDay: 50000,
    ...overrides,
  });

  describe('Core behavior with monitor privileges', () => {
    it('renders size (formatted) and document count when stats available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 2048576, // 2MB
        totalDocs: 500,
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText(/Storage size/i)).toBeInTheDocument();
      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent(/2\.0\s?MB/);
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('500 documents');
    });
    it('falls back to dash when there is a stats error', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();
      const error = new Error('Failed to fetch stats');

      render(<StorageSizeCard definition={definition} stats={stats} statsError={error} />);

      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent('-');
    });
    it('handles zero sizeBytes & totalDocs gracefully (dash values)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 0,
        totalDocs: 0,
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);
      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent('-');
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('- documents');
    });
  });

  describe('Privilege gating', () => {
    it('shows warning icon without monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      render(<StorageSizeCard definition={definition} stats={stats} />);

      const warningButtons = screen.getAllByRole('button', {
        name: /don't have sufficient privileges/i,
      });
      expect(warningButtons.length).toBeGreaterThanOrEqual(1);
    });
    it('falls back to dash for document count when totalDocs missing', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ totalDocs: undefined as any });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent(/1\.0\s?MB/);
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('- documents');
    });
  });
});
