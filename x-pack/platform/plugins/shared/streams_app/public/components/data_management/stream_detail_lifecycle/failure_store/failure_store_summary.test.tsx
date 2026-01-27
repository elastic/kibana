/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';
import { FailureStoreSummary } from './failure_store_summary';

jest.mock('../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000' },
      warm: { color: '#FFA500' },
      cold: { color: '#0000FF' },
      frozen: { color: '#00FFFF' },
      delete: { color: '#808080' },
    },
  }),
}));

describe('FailureStoreSummary', () => {
  const createMockFailureStoreConfig = (
    overrides: Partial<ReturnType<typeof useFailureStoreConfig>> = {}
  ): ReturnType<typeof useFailureStoreConfig> => ({
    failureStoreEnabled: true,
    retentionDisabled: false,
    customRetentionPeriod: undefined,
    defaultRetentionPeriod: '7d',
    inheritOptions: {
      canShowInherit: false,
      isWired: false,
      isCurrentlyInherited: false,
    },
    ...overrides,
  });

  const createMockStats = (size?: number): EnhancedFailureStoreStats | undefined =>
    size !== undefined ? ({ size } as EnhancedFailureStoreStats) : undefined;

  describe('Failure Store - Serverless', () => {
    it('should render "Failed ingest" label', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig();

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('lifecyclePhase-Failed ingest-name')).toBeInTheDocument();
    });

    it('should display storage size', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig();

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('lifecyclePhase-Failed ingest-size')).toHaveTextContent(
        /100\.0\s?KB/
      );
    });

    it('should render delete icon when retention period is set', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '7d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should use custom retention period when set', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig({
        customRetentionPeriod: '14d',
        defaultRetentionPeriod: '7d',
      });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Failure Store - Non-Serverless', () => {
    it('should render "Failed ingest" label', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('lifecyclePhase-Failed ingest-name')).toBeInTheDocument();
    });

    it('should display storage size', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('lifecyclePhase-Failed ingest-size')).toHaveTextContent(
        /250\.0\s?KB/
      );
    });

    it('should render delete icon when retention period is set', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Infinite Retention', () => {
    it('should not render delete icon when retention is disabled', () => {
      const stats = createMockStats(50000);
      const failureStoreConfig = createMockFailureStoreConfig({ retentionDisabled: true });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.queryByTestId('dataLifecycle-delete-icon')).not.toBeInTheDocument();
    });

    it('should render infinite symbol when retention is disabled', () => {
      const stats = createMockStats(50000);
      const failureStoreConfig = createMockFailureStoreConfig({ retentionDisabled: true });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });
});
