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

// Mock the PrivilegesWarningIconWrapper component
jest.mock('../../../../insufficient_privileges/insufficient_privileges', () => ({
  PrivilegesWarningIconWrapper: ({ children, hasPrivileges }: any) => (
    <div data-test-subj="privileges-wrapper" data-has-privileges={hasPrivileges}>
      {children}
    </div>
  ),
}));

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

      expect(screen.getByText('Storage size')).toBeInTheDocument();
      // Implementation formats with one decimal and a space: e.g. '2.0 MB'
      expect(screen.getByText(/2\.0\s?MB/)).toBeInTheDocument();
      expect(screen.getByText('500 documents')).toBeInTheDocument();
    });
    it('falls back to dash when there is a stats error', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();
      const error = new Error('Failed to fetch stats');

      render(<StorageSizeCard definition={definition} stats={stats} statsError={error} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });
    it('handles zero sizeBytes & totalDocs gracefully (dash values)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 0,
        totalDocs: 0,
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);
      expect(screen.getByText('-')).toBeInTheDocument();
      // totalDocs = 0 renders '- documents'
      expect(screen.getByText('- documents')).toBeInTheDocument();
    });
  });

  describe('Privilege gating', () => {
    it('wraps content and hides document count without monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      render(<StorageSizeCard definition={definition} stats={stats} />);

      const privilegesWrapper = screen.getByTestId('privileges-wrapper');
      expect(privilegesWrapper).toHaveAttribute('data-has-privileges', 'false');
      expect(screen.queryByText(/documents/)).not.toBeInTheDocument();
    });
    it('falls back to dash for document count when totalDocs missing', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ totalDocs: undefined as any });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText(/1\.0\s?MB/)).toBeInTheDocument();
      expect(screen.getByText('- documents')).toBeInTheDocument();
    });
  });
});
