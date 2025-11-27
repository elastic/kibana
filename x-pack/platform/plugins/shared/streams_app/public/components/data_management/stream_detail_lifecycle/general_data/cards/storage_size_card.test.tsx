/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StorageSizeCard } from './storage_size_card';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';

const createMockStats = (
  totalDocs: number | undefined,
  sizeBytes: number = 1000000 // 1MB
): DataStreamStats => ({
  name: 'test-stream',
  userPrivileges: {
    canMonitor: true,
    canReadFailureStore: true,
    canManageFailureStore: true,
  },
  totalDocs,
  sizeBytes,
  creationDate: 1672531200000,
  size: '1.0 MB',
  hasFailureStore: true,
});

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('StorageSizeCard', () => {
  describe('Core behavior with monitor privileges', () => {
    it('renders size (formatted) and document count when stats available', () => {
      const stats = createMockStats(500, 2048576); // 2MB

      renderWithI18n(<StorageSizeCard hasMonitorPrivileges={true} stats={stats} />);

      expect(screen.getByTestId('storageSize-title')).toBeInTheDocument();
      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent(/2\.0\s?MB/);
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('500 documents');
    });

    it('falls back to dash when there is a stats error', () => {
      const stats = createMockStats(100);
      const error = new Error('Failed to fetch stats');

      renderWithI18n(
        <StorageSizeCard hasMonitorPrivileges={true} stats={stats} statsError={error} />
      );

      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent('-');
    });

    it('renders zero sizeBytes & totalDocs', () => {
      const stats = createMockStats(0, 0);

      renderWithI18n(<StorageSizeCard hasMonitorPrivileges={true} stats={stats} />);
      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent('0.0 B');
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('0 documents');
    });
  });

  describe('Privilege gating', () => {
    it('shows warning icon without monitor privilege', () => {
      const stats = createMockStats(100);

      renderWithI18n(<StorageSizeCard hasMonitorPrivileges={false} stats={stats} />);

      expect(screen.getByTestId('storageSize-metric')).toBeInTheDocument();
      // Should show warning icons when lacking privileges
      expect(screen.getByTestId('streamsInsufficientPrivileges-storageSize')).toBeInTheDocument();
    });

    it('falls back to dash for document count when totalDocs missing', () => {
      const stats = createMockStats(undefined);

      renderWithI18n(<StorageSizeCard hasMonitorPrivileges={true} stats={stats} />);

      expect(screen.getByTestId('storageSize-metric')).toHaveTextContent(/1\.0\s?MB/);
      expect(screen.getByTestId('storageSize-metric-subtitle')).toHaveTextContent('- documents');
    });
  });
});
