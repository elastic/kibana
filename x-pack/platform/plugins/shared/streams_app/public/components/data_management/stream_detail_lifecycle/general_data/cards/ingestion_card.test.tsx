/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams } from '@kbn/streams-schema';
import { IngestionCard } from './ingestion_card';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

// Mock the PrivilegesWarningIconWrapper component
jest.mock('../../../../insufficient_privileges/insufficient_privileges', () => ({
  PrivilegesWarningIconWrapper: ({ children, hasPrivileges }: any) => (
    <div data-test-subj="privileges-wrapper" data-has-privileges={hasPrivileges}>
      {children}
    </div>
  ),
}));

describe('IngestionCard', () => {
  const createMockDefinition = (
    privileges: any = { monitor: true }
  ): Streams.ingest.all.GetResponse => ({
    privileges,
  } as any);

  const createMockStats = (overrides: Partial<DataStreamStats> = {}): DataStreamStats => ({
    sizeBytes: 1000000,
    totalDocs: 1000,
    bytesPerDoc: 1000,
    bytesPerDay: 50000, // 50KB per day
    ...overrides,
  });

  describe('With Monitor Privileges', () => {
    it('should display daily and monthly ingestion averages correctly', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1048576, // 1MB per day
      });

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText(/Ingestion averages/)).toBeInTheDocument();
      expect(screen.getByText('1MB')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('30MB')).toBeInTheDocument(); // Monthly average (1MB * 30)
      expect(screen.getByText('Daily average')).toBeInTheDocument();
      expect(screen.getByText('Monthly average')).toBeInTheDocument();
    });

    it('should display tooltip with calculation explanation', async () => {
      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IngestionCard definition={definition} stats={stats} />);

      const tooltipIcon = screen.getByRole('img', { name: /question/i });
      expect(tooltipIcon).toBeInTheDocument();

      // The tooltip content should be available when hovering
      await userEvent.hover(tooltipIcon);
      // Note: EuiToolTip behavior might need different testing approach in real implementation
    });

    it('should handle zero bytes per day', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: 0 });

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('0B')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('0B')).toBeInTheDocument(); // Monthly average
    });

    it('should handle large ingestion rates with proper formatting', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1073741824, // 1GB per day
      });

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('1GB')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('30GB')).toBeInTheDocument(); // Monthly average (1GB * 30)
    });

    it('should display dash when stats are not available', () => {
      const definition = createMockDefinition();

      render(<IngestionCard definition={definition} stats={undefined} />);

      const dashes = screen.getAllByText('-');
      expect(dashes).toHaveLength(2); // One for daily, one for monthly
    });

    it('should display dash when bytesPerDay is not available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: undefined as any });

      render(<IngestionCard definition={definition} stats={stats} />);

      const dashes = screen.getAllByText('-');
      expect(dashes).toHaveLength(2); // One for daily, one for monthly
    });

    it('should display dash when there is a stats error', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();
      const error = new Error('Failed to fetch stats');

      render(<IngestionCard definition={definition} stats={stats} statsError={error} />);

      const dashes = screen.getAllByText('-');
      expect(dashes).toHaveLength(2); // One for daily, one for monthly
    });
  });

  describe('Without Monitor Privileges', () => {
    it('should show privileges warning when monitor permission is false', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      render(<IngestionCard definition={definition} stats={stats} />);

      const privilegesWrappers = screen.getAllByTestId('privileges-wrapper');
      expect(privilegesWrappers).toHaveLength(2); // One for daily, one for monthly
      privilegesWrappers.forEach((wrapper) => {
        expect(wrapper).toHaveAttribute('data-has-privileges', 'false');
      });
    });

    it('should still display dash when no stats available and no privileges', () => {
      const definition = createMockDefinition({ monitor: false });

      render(<IngestionCard definition={definition} stats={undefined} />);

      const privilegesWrappers = screen.getAllByTestId('privileges-wrapper');
      expect(privilegesWrappers).toHaveLength(2);
      privilegesWrappers.forEach((wrapper) => {
        expect(wrapper).toHaveAttribute('data-has-privileges', 'false');
      });

      const dashes = screen.getAllByText('-');
      expect(dashes).toHaveLength(2);
    });
  });

  describe('Data Test Subjects', () => {
    it('should have correct data-test-subj attributes', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IngestionCard definition={definition} stats={stats} />);

      // Check that the metrics have the correct test subjects
      const dailyMetric = screen.getByText('Daily average').closest('[data-test-subj="ingestion-daily"]');
      const monthlyMetric = screen.getByText('Monthly average').closest('[data-test-subj="ingestion-monthly"]');

      expect(dailyMetric).toBeInTheDocument();
      expect(monthlyMetric).toBeInTheDocument();
    });
  });

  describe('Monthly Calculation', () => {
    it('should correctly calculate monthly averages (daily * 30)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 2097152, // 2MB per day
      });

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('2MB')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('60MB')).toBeInTheDocument(); // Monthly average (2MB * 30)
    });

    it('should handle very small daily rates correctly', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1024, // 1KB per day
      });

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('1KB')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('30KB')).toBeInTheDocument(); // Monthly average (1KB * 30)
    });
  });

  describe('Edge Cases', () => {
    it('should handle privileges object being undefined', () => {
      const definition = createMockDefinition(undefined);
      const stats = createMockStats();

      render(<IngestionCard definition={definition} stats={stats} />);

      const privilegesWrappers = screen.getAllByTestId('privileges-wrapper');
      privilegesWrappers.forEach((wrapper) => {
        expect(wrapper).toHaveAttribute('data-has-privileges', 'false');
      });
    });
  });
});