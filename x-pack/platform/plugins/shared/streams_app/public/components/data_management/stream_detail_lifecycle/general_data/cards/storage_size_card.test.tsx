/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorageSizeCard } from './storage_size_card';
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

// Mock formatNumber from @elastic/eui
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  formatNumber: jest.fn((value: number, format: string) => {
    if (format === '0,0') {
      return value.toLocaleString();
    }
    return value.toString();
  }),
}));

describe('StorageSizeCard', () => {
  const createMockDefinition = (
    privileges = { monitor: true }
  ): Streams.ingest.all.GetResponse => ({
    stream: { name: 'test-stream' },
    privileges,
  } as unknown as Streams.ingest.all.GetResponse);

  const createMockStats = (
    sizeBytes?: number,
    totalDocs?: number
  ): DataStreamStats => ({
    sizeBytes,
    totalDocs,
  } as DataStreamStats);

  describe('Basic Rendering', () => {
    it('renders storage size card title', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('Storage size')).toBeInTheDocument();
    });

    it('renders with privileges wrapper', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-storageSize')).toBeInTheDocument();
      expect(screen.getByTestId('privileges-wrapper-storageSize')).toHaveAttribute(
        'data-has-privileges',
        'true'
      );
    });
  });

  describe('Storage Size Display', () => {
    it('displays formatted storage size when stats are available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1073741824, 1000); // 1 GB

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('1.0 GB')).toBeInTheDocument();
    });

    it('displays dash when stats are not available', () => {
      const definition = createMockDefinition();

      render(<StorageSizeCard definition={definition} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays dash when sizeBytes is not available', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(undefined, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays dash when statsError is present', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024, 1000);
      const statsError = new Error('Failed to fetch stats');

      render(<StorageSizeCard definition={definition} stats={stats} statsError={statsError} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles various storage sizes correctly', () => {
      const testCases = [
        { bytes: 512, expected: '512 B' },
        { bytes: 1536, expected: '1.5 KB' },
        { bytes: 2 * 1024 * 1024, expected: '2.0 MB' },
        { bytes: 3.5 * 1024 * 1024 * 1024, expected: '3.5 GB' },
      ];

      testCases.forEach(({ bytes, expected }) => {
        const definition = createMockDefinition();
        const stats = createMockStats(bytes, 1000);

        const { rerender } = render(
          <StorageSizeCard definition={definition} stats={stats} />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Document Count Display', () => {
    it('displays formatted document count when user has monitor privileges and stats are available', () => {
      const definition = createMockDefinition({ monitor: true });
      const stats = createMockStats(1024 * 1024, 1500000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('1,500,000 documents')).toBeInTheDocument();
    });

    it('displays dash for document count when totalDocs is not available', () => {
      const definition = createMockDefinition({ monitor: true });
      const stats = createMockStats(1024 * 1024, undefined);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByText('- documents')).toBeInTheDocument();
    });

    it('does not display document count when user lacks monitor privileges', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.queryByText(/documents/)).not.toBeInTheDocument();
    });

    it('handles various document counts correctly', () => {
      const testCases = [
        { totalDocs: 100, expected: '100 documents' },
        { totalDocs: 1000, expected: '1,000 documents' },
        { totalDocs: 1234567, expected: '1,234,567 documents' },
      ];

      testCases.forEach(({ totalDocs, expected }) => {
        const definition = createMockDefinition({ monitor: true });
        const stats = createMockStats(1024 * 1024, totalDocs);

        const { rerender } = render(
          <StorageSizeCard definition={definition} stats={stats} />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Privileges Handling', () => {
    it('passes correct privileges to wrapper for monitor privilege', () => {
      const definition = createMockDefinition({ monitor: true });
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-storageSize')).toHaveAttribute(
        'data-has-privileges',
        'true'
      );
    });

    it('passes correct privileges to wrapper when lacking monitor privilege', () => {
      const definition = createMockDefinition({ monitor: false });
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-storageSize')).toHaveAttribute(
        'data-has-privileges',
        'false'
      );
    });

    it('handles undefined monitor privilege as false', () => {
      const definition = createMockDefinition({ monitor: undefined });
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('privileges-wrapper-storageSize')).toHaveAttribute(
        'data-has-privileges',
        'false'
      );
    });
  });

  describe('Data Test Subjects', () => {
    it('includes correct data-test-subj for storage size metric', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024, 1000);

      render(<StorageSizeCard definition={definition} stats={stats} />);

      expect(screen.getByTestId('storageSize-metric')).toBeInTheDocument();
    });
  });
});