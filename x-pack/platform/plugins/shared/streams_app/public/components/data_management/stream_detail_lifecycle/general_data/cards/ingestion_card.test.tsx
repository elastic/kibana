/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IngestionCard } from './ingestion_card';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

// Mock the formatBytes helper
jest.mock('../../helpers/format_bytes', () => ({
  formatBytes: jest.fn((bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }),
}));

// Mock the PrivilegesWarningIconWrapper
jest.mock('../../../../insufficient_privileges/insufficient_privileges', () => ({
  PrivilegesWarningIconWrapper: ({
    children,
    hasPrivileges,
    title,
  }: {
    children: React.ReactNode;
    hasPrivileges: boolean;
    title: string;
  }) => (
    <div data-testid={`privileges-wrapper-${title}`} data-has-privileges={hasPrivileges}>
      {children}
    </div>
  ),
}));

// Mock @kbn/i18n-react
jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({
    id,
    defaultMessage,
    values,
  }: {
    id: string;
    defaultMessage: string;
    values?: { tooltipIcon?: React.ReactNode };
  }) => (
    <span data-testid="formatted-message">
      {defaultMessage.replace('{tooltipIcon}', '')}
      {values?.tooltipIcon}
    </span>
  ),
}));

describe('IngestionCard', () => {
  const createMockDefinition = (
    privileges = { monitor: true }
  ): Streams.ingest.all.GetResponse => ({
    stream: { name: 'test-stream' },
    privileges,
  } as unknown as Streams.ingest.all.GetResponse);

  const createMockStats = (bytesPerDay?: number): DataStreamStats => ({
    bytesPerDay,
  } as DataStreamStats);

  describe('Basic Rendering', () => {
    it('renders ingestion card with title and tooltip', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('formatted-message')).toBeInTheDocument();
      expect(screen.getByText(/Ingestion averages/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /How we calculate ingestion averages/ })).toBeInTheDocument();
    });

    it('displays tooltip with calculation method explanation', async () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      const tooltipButton = screen.getByRole('button', { name: /How we calculate ingestion averages/ });
      await userEvent.hover(tooltipButton);

      // The tooltip content should be accessible
      expect(screen.getByText(/Approximate average/)).toBeInTheDocument();
    });
  });

  describe('Daily Ingestion Metrics', () => {
    it('displays formatted daily ingestion rate when stats are available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024); // 1 MB per day

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('Daily average')).toBeInTheDocument();
    });

    it('displays dash when bytesPerDay is not available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(undefined);

      render(<IngestionCard definition={definition} stats={stats} />);

      const dailyWrapper = screen.getByTestId('privileges-wrapper-Daily ingestion rate');
      expect(dailyWrapper).toHaveTextContent('-');
    });

    it('displays dash when stats are not provided', () => {
      const definition = createMockDefinition();

      render(<IngestionCard definition={definition} />);

      const dailyWrapper = screen.getByTestId('privileges-wrapper-Daily ingestion rate');
      expect(dailyWrapper).toHaveTextContent('-');
    });

    it('displays dash when statsError is present', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);
      const statsError = new Error('Failed to fetch stats');

      render(<IngestionCard definition={definition} stats={stats} statsError={statsError} />);

      const dailyWrapper = screen.getByTestId('privileges-wrapper-Daily ingestion rate');
      expect(dailyWrapper).toHaveTextContent('-');
    });

    it('handles zero bytes per day', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(0);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('0 B')).toBeInTheDocument();
    });
  });

  describe('Monthly Ingestion Metrics', () => {
    it('displays calculated monthly ingestion rate (daily * 30)', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024); // 1 MB per day

      render(<IngestionCard definition={definition} stats={stats} />);

      // Should show 30 MB for monthly (1 MB * 30)
      expect(screen.getByText('30.0 MB')).toBeInTheDocument();
      expect(screen.getByText('Monthly average')).toBeInTheDocument();
    });

    it('displays dash when bytesPerDay is not available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(undefined);

      render(<IngestionCard definition={definition} stats={stats} />);

      const monthlyWrapper = screen.getByTestId('privileges-wrapper-Monthly ingestion rate');
      expect(monthlyWrapper).toHaveTextContent('-');
    });

    it('displays dash when statsError is present', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);
      const statsError = new Error('Failed to fetch stats');

      render(<IngestionCard definition={definition} stats={stats} statsError={statsError} />);

      const monthlyWrapper = screen.getByTestId('privileges-wrapper-Monthly ingestion rate');
      expect(monthlyWrapper).toHaveTextContent('-');
    });

    it('handles zero bytes per day for monthly calculation', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(0);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByText('0 B')).toBeInTheDocument(); // Monthly should also be 0
    });
  });

  describe('Ingestion Rate Calculations', () => {
    it('handles various daily ingestion rates correctly', () => {
      const testCases = [
        { bytesPerDay: 512, expectedDaily: '512 B', expectedMonthly: '15.0 KB' },
        { bytesPerDay: 1024 * 512, expectedDaily: '512.0 KB', expectedMonthly: '15.0 MB' },
        { bytesPerDay: 1024 * 1024 * 2, expectedDaily: '2.0 MB', expectedMonthly: '60.0 MB' },
        { bytesPerDay: 1024 * 1024 * 1024, expectedDaily: '1.0 GB', expectedMonthly: '30.0 GB' },
      ];

      testCases.forEach(({ bytesPerDay, expectedDaily, expectedMonthly }) => {
        const definition = createMockDefinition();
        const stats = createMockStats(bytesPerDay);

        const { rerender } = render(
          <IngestionCard definition={definition} stats={stats} />
        );

        expect(screen.getByText(expectedDaily)).toBeInTheDocument();
        expect(screen.getByText(expectedMonthly)).toBeInTheDocument();

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Privileges Handling', () => {
    it('passes correct privileges to wrapper components when user has monitor privilege', () => {
      const definition = createMockDefinition({ monitor: true });
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-Daily ingestion rate')).toHaveAttribute(
        'data-has-privileges',
        'true'
      );
      expect(screen.getByTestId('privileges-wrapper-Monthly ingestion rate')).toHaveAttribute(
        'data-has-privileges',
        'true'
      );
    });

    it('passes correct privileges to wrapper components when user lacks monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-Daily ingestion rate')).toHaveAttribute(
        'data-has-privileges',
        'false'
      );
      expect(screen.getByTestId('privileges-wrapper-Monthly ingestion rate')).toHaveAttribute(
        'data-has-privileges',
        'false'
      );
    });
  });

  describe('Data Test Subjects', () => {
    it('includes correct data-test-subj for daily ingestion metric', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-daily-metric')).toBeInTheDocument();
    });

    it('includes correct data-test-subj for monthly ingestion metric', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);

      render(<IngestionCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('ingestion-monthly-metric')).toBeInTheDocument();
    });
  });
});