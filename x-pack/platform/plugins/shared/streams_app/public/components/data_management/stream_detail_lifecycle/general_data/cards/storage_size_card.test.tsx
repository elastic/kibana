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
  ): Streams.ingest.all.GetResponse => ({
    privileges,
  } as any);

  const createMockStats = (overrides: Partial<DataStreamStats> = {}): DataStreamStats => ({
    sizeBytes: 1000000, // 1MB
    totalDocs: 1000,
    bytesPerDoc: 1000,
    bytesPerDay: 50000,
    ...overrides,
  });

  describe('With Monitor Privileges', () => {
    it('should display storage size and document count correctly', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 2048576, // 2MB  
        totalDocs: 500,
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('Storage size')).toBeInTheDocument();
      expect(screen.getByText('2MB')).toBeInTheDocument();
      expect(screen.getByText('500 documents')).toBeInTheDocument();
    });

    it('should display large numbers with proper formatting', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 1073741824, // 1GB
        totalDocs: 1000000, // 1M docs
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('1GB')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 documents')).toBeInTheDocument();
    });

    it('should display dash when stats are not available', () => {
      const definition = createMockDefinition();

      render(<StorageSizeCard definition={definition} stats={undefined} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should display dash when sizeBytes is not available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ sizeBytes: undefined as any });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should display dash when there is a stats error', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();
      const error = new Error('Failed to fetch stats');

      render(<StorageSizeCard definition={definition} stats={stats} statsError={error} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle zero bytes correctly', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        sizeBytes: 0,
        totalDocs: 0,
      });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('0B')).toBeInTheDocument();
      expect(screen.getByText('0 documents')).toBeInTheDocument();
    });
  });

  describe('Without Monitor Privileges', () => {
    it('should show privileges warning when monitor permission is false', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      render(<StorageSizeCard definition={definition} stats={stats} />);

      const privilegesWrapper = screen.getByTestId('privileges-wrapper');
      expect(privilegesWrapper).toHaveAttribute('data-has-privileges', 'false');
    });

    it('should not show document count subtitle when no monitor privileges', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats({ totalDocs: 1000 });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.queryByText('1,000 documents')).not.toBeInTheDocument();
    });

    it('should still display dash when no stats available and no privileges', () => {
      const definition = createMockDefinition({ monitor: false });

      render(<StorageSizeCard definition={definition} stats={undefined} />);

      const privilegesWrapper = screen.getByTestId('privileges-wrapper');
      expect(privilegesWrapper).toHaveAttribute('data-has-privileges', 'false');
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Data Test Subjects', () => {
    it('should have correct data-test-subj attributes', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<StorageSizeCard definition={definition} stats={stats} />);

      // The storageSize data-test-subj should be present in the metric
      expect(screen.getByTestId('privileges-wrapper')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing totalDocs gracefully', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ totalDocs: undefined as any });

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('1MB')).toBeInTheDocument();
      expect(screen.getByText('- documents')).toBeInTheDocument();
    });

    it('should handle privileges object being undefined', () => {
      const definition = createMockDefinition(undefined);
      const stats = createMockStats();

      render(<StorageSizeCard definition={definition} stats={stats} />);

      const privilegesWrapper = screen.getByTestId('privileges-wrapper');
      expect(privilegesWrapper).toHaveAttribute('data-has-privileges', 'false');
    });
  });
});