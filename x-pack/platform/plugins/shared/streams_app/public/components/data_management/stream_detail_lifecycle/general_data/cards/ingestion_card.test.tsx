/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
// userEvent not required after pruning interaction tests
import type { Streams } from '@kbn/streams-schema';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestionCard } from './ingestion_card';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

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
  ): Streams.ingest.all.GetResponse =>
    ({
      privileges,
    } as any);

  const createMockStats = (overrides: Partial<DataStreamStats> = {}): DataStreamStats => ({
    name: 'test-stream',
    userPrivileges: {
      canMonitor: true,
      canReadFailureStore: true,
      canManageFailureStore: true,
    },
    size: '1MB',
    sizeBytes: 1000000,
    totalDocs: 1000,
    bytesPerDoc: 1000,
    bytesPerDay: 50000, // 50KB per day
    ...overrides,
  });

  describe('Core behavior with monitor privileges', () => {
    it('renders daily and monthly ingestion averages', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1048576, // 1MB per day
      });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText(/Ingestion averages/)).toBeInTheDocument();
      expect(screen.getByText(/1(\.0)?\s?MB/)).toBeInTheDocument(); // Daily average
      expect(screen.getByText(/3[01](\.\d)?\s?MB/)).toBeInTheDocument(); // Monthly average (1MB * 30/31)
      expect(screen.getByText('Daily average')).toBeInTheDocument();
      expect(screen.getByText('Monthly average')).toBeInTheDocument();
    });

    it('renders dash placeholders when daily bytes is zero', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: 0 });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      // Should render dash for zero bytes
      const dashes = screen.getAllByText('-');
      expect(dashes).toHaveLength(2); // One for daily, one for monthly
    });

    it('formats large ingestion rates (GB scale)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1073741824, // 1GB per day
      });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText(/1(\.0)?\s?GB/)).toBeInTheDocument(); // Daily average
      expect(screen.getByText(/3[12](\.\d)?\s?GB/)).toBeInTheDocument(); // Monthly average (1GB * 31/32)
    });

    it('renders dashes when stats are absent or error present', () => {
      const definition = createMockDefinition();
      renderWithI18n(<IngestionCard definition={definition} stats={undefined} />);
      const dashes1 = screen.getAllByText('-');
      expect(dashes1).toHaveLength(2);

      const stats = createMockStats();
      const error = new Error('Failed');
      renderWithI18n(<IngestionCard definition={definition} stats={stats} statsError={error} />);
      const dashes2 = screen.getAllByText('-');
      expect(dashes2.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Privilege gating', () => {
    it('wraps metrics and hides values without monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      const privilegesWrappers = screen.getAllByTestId('privileges-wrapper');
      expect(privilegesWrappers).toHaveLength(2); // One for daily, one for monthly
      privilegesWrappers.forEach((wrapper) => {
        expect(wrapper).toHaveAttribute('data-has-privileges', 'false');
      });
    });
  });

  describe('Monthly calculation', () => {
    it('calculates monthly average (daily * ~30)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 2097152, // 2MB per day
      });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText(/2(\.0)?\s?MB/)).toBeInTheDocument(); // Daily average
      expect(screen.getByText(/6[12](\.\d)?\s?MB/)).toBeInTheDocument(); // Monthly average (2MB * 31/32)
    });

    it('formats very small daily rates (KB)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1024, // 1KB per day
      });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText(/1(\.0)?\s?KB/)).toBeInTheDocument(); // Daily average
      expect(screen.getByText(/3[01](\.\d)?\s?KB/)).toBeInTheDocument(); // Monthly average (1KB * 30/31)
    });
  });

  describe('Edge cases', () => {
    it('defaults privileges when undefined', () => {
      const definition = createMockDefinition(undefined);
      const stats = createMockStats();

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      const privilegesWrappers = screen.getAllByTestId('privileges-wrapper');
      privilegesWrappers.forEach((w) => expect(w).toHaveAttribute('data-has-privileges', 'true'));
    });
  });
});
