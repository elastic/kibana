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
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

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
      const stats = createMockStats({
        bytesPerDay: 1073741824, // 1GB per day
      });

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

      // Check for warning icon buttons (streamsInsufficientPrivileges prefix)
      const warningButtons = screen.getAllByRole('button', {
        name: /don't have sufficient privileges/i,
      });
      expect(warningButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Monthly calculation', () => {
    it('calculates monthly average (daily * ~30)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 2097152, // 2MB per day
      });

      renderWithI18n(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/2(\.0)?\s?MB/);
      expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/6[12](\.\d)?\s?MB/);
    });

    it('formats very small daily rates (KB)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats({
        bytesPerDay: 1024, // 1KB per day
      });

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

      // Should not show warning icons when privileges are undefined (defaults to true)
      const warningButtons = screen.queryAllByRole('button', {
        name: /don't have sufficient privileges/i,
      });
      expect(warningButtons.length).toBe(0);
    });
  });
});
