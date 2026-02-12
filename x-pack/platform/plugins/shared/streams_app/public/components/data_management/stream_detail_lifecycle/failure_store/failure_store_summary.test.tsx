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

jest.mock('../../../../hooks/use_kibana');

import { useKibana } from '../../../../hooks/use_kibana';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000', description: 'Hot phase' },
      warm: { color: '#FFA500', description: 'Warm phase' },
      cold: { color: '#0000FF', description: 'Cold phase' },
      frozen: { color: '#00FFFF', description: 'Frozen phase' },
      delete: { color: '#808080', description: 'Delete phase' },
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
    beforeEach(() => {
      mockUseKibana.mockReturnValue({ isServerless: true } as any);
    });

    it('should render "Failed ingest" label', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig();

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(
        screen.getByTestId('failureStore-lifecyclePhase-Failed ingest-name')
      ).toBeInTheDocument();
    });

    it('should display storage size', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig();

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(
        screen.getByTestId('failureStore-lifecyclePhase-Failed ingest-size')
      ).toHaveTextContent(/100\.0\s?KB/);
    });

    it('should render delete icon when retention period is set', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '7d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('failureStore-dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should use custom retention period when set', () => {
      const stats = createMockStats(100000);
      const failureStoreConfig = createMockFailureStoreConfig({
        customRetentionPeriod: '14d',
        defaultRetentionPeriod: '7d',
      });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('failureStore-dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Failure Store - Non-Serverless', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({ isServerless: false } as any);
    });

    it('should render "Hot" label', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('failureStore-lifecyclePhase-Hot-name')).toBeInTheDocument();
    });

    it('should display storage size', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('failureStore-lifecyclePhase-Hot-size')).toHaveTextContent(
        /250\.0\s?KB/
      );
    });

    it('should render delete icon when retention period is set', () => {
      const stats = createMockStats(250000);
      const failureStoreConfig = createMockFailureStoreConfig({ defaultRetentionPeriod: '30d' });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByTestId('failureStore-dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Infinite Retention', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({ isServerless: true } as any);
    });

    it('should not render delete icon when retention is disabled', () => {
      const stats = createMockStats(50000);
      const failureStoreConfig = createMockFailureStoreConfig({ retentionDisabled: true });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(
        screen.queryByTestId('failureStore-dataLifecycle-delete-icon')
      ).not.toBeInTheDocument();
    });

    it('should render infinite symbol when retention is disabled', () => {
      const stats = createMockStats(50000);
      const failureStoreConfig = createMockFailureStoreConfig({ retentionDisabled: true });

      render(<FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });
});
