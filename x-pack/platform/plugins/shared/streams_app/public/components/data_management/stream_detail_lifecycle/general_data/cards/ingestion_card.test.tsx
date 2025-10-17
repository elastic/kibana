/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestionCard } from './ingestion_card';
import type { EnhancedDataStreamStats } from '../../hooks/use_data_stream_stats';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IngestionCard', () => {
  const createMockDefinition = (
    privileges: { monitor: boolean } = { monitor: true }
  ): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'test-stream',
        description: 'test-stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          settings: {},
          wired: { fields: {}, routing: [] },
        },
      },
      privileges: {
        manage: true,
        monitor: privileges.monitor,
        lifecycle: true,
        simulate: true,
        text_structure: true,
        read_failure_store: true,
        manage_failure_store: true,
      },
      dashboards: [],
      rules: [],
      queries: [],
    } as any);

  const createMockStats = (
    overrides: Partial<EnhancedDataStreamStats> = {}
  ): EnhancedDataStreamStats => ({
    // Base DataStreamStats properties
    name: 'test-stream',
    userPrivileges: {
      canMonitor: true,
      canReadFailureStore: true,
      canManageFailureStore: true,
    },
    totalDocs: 1000,
    sizeBytes: 1000000,
    // creationDate in DataStreamStats appears to be a timestamp number; use epoch ms
    creationDate: 1672531200000,
    // CalculatedStats properties
    bytesPerDoc: 1000,
    bytesPerDay: 50000,
    size: '1.0 MB',
    ...overrides,
  });

  describe('Core behavior with monitor privileges', () => {
    it('renders daily and monthly ingestion averages', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: 1048576 }); // 1MB per day

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestionCard-title')).toBeInTheDocument();
      expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/1(\.0)?\s?MB/);
      expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/3[01](\.\d)?\s?MB/);
      expect(screen.getByTestId('ingestion-daily-metric-subtitle')).toHaveTextContent(
        'Daily average'
      );
      expect(screen.getByTestId('ingestion-monthly-metric-subtitle')).toHaveTextContent(
        'Monthly average'
      );
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
      const stats = createMockStats({ bytesPerDay: 1073741824 }); // 1GB per day

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/1(\.0)?\s?GB/);
      expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/3[12](\.\d)?\s?GB/);
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
    it('shows warning icon without monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats();

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      // Should show warning icons when lacking privileges
      expect(
        screen.getByTestId('streamsInsufficientPrivileges-ingestionDaily')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('streamsInsufficientPrivileges-ingestionMonthly')
      ).toBeInTheDocument();
    });
  });

  describe('Monthly calculation', () => {
    it('calculates monthly average (daily * ~30)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: 2097152 }); // 2MB per day

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/2(\.0)?\s?MB/);
      expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/6[12](\.\d)?\s?MB/);
    });

    it('formats very small daily rates (KB)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({ bytesPerDay: 1024 }); // 1KB per day

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/1(\.0)?\s?KB/);
      expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/3[01](\.\d)?\s?KB/);
    });
  });

  describe('Edge cases', () => {
    it('defaults privileges when undefined', () => {
      const definition = createMockDefinition(undefined);
      const stats = createMockStats();

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      // There should be no warning icon when user has privileges
      expect(
        screen.queryByTestId('streamsInsufficientPrivileges-ingestionDaily')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('streamsInsufficientPrivileges-ingestionMonthly')
      ).not.toBeInTheDocument();
    });
  });
});
