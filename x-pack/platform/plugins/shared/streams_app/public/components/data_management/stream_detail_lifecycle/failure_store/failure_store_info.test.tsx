/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { FailureStoreInfo } from './failure_store_info';
import type { FailureStoreStats } from '../hooks/use_failure_store_stats';

// Mock the child components
jest.mock('./cards/retention_card', () => ({
  RetentionCard: ({ openModal, definition, failureStore }: any) => (
    <div data-test-subj="failure-store-retention-card">
      <div>Retention Card</div>
      <div>Stream: {definition.stream.name}</div>
      <div>Failure Store Enabled: {failureStore?.enabled?.toString()}</div>
      <button onClick={() => openModal(true)}>Edit Retention</button>
    </div>
  ),
}));

jest.mock('./cards/storage_size_card', () => ({
  StorageSizeCard: ({ stats, definition, statsError }: any) => (
    <div data-test-subj="failure-store-storage-card">
      <div>Storage Card</div>
      <div>Stream: {definition.stream.name}</div>
      <div>Size: {stats?.sizeBytes || 'No data'}</div>
      <div>Error: {statsError?.message || 'None'}</div>
    </div>
  ),
}));

jest.mock('./cards/ingestion_card', () => ({
  IngestionCard: ({ stats, definition, statsError }: any) => (
    <div data-test-subj="failure-store-ingestion-card">
      <div>Ingestion Card</div>
      <div>Stream: {definition.stream.name}</div>
      <div>Docs: {stats?.totalDocs || 'No data'}</div>
      <div>Error: {statsError?.message || 'None'}</div>
    </div>
  ),
}));

jest.mock('./ingestion_rate', () => ({
  FailureStoreIngestionRate: ({ definition, isLoadingStats, stats }: any) => (
    <div data-test-subj="failure-store-ingestion-rate">
      <div>Ingestion Rate Chart</div>
      <div>Stream: {definition.stream.name}</div>
      <div>Loading: {isLoadingStats.toString()}</div>
      <div>Has Stats: {(!!stats).toString()}</div>
    </div>
  ),
}));

describe('FailureStoreInfo', () => {
  const mockOpenModal = jest.fn();

  const createMockDefinition = (streamName: string = 'logs-test'): Streams.ingest.all.GetResponse => ({
    stream: {
      name: streamName,
    },
  } as any);

  const createMockStats = (): FailureStoreStats => ({
    sizeBytes: 1000000,
    totalDocs: 5000,
  });

  const createMockConfig = (): FailureStore => ({
    enabled: true,
    retentionPeriod: {
      default: '30d',
      custom: '7d',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render failure store title with tooltip', () => {
      const definition = createMockDefinition();
      
      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      expect(screen.getByText('Failure store')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /info/i })).toBeInTheDocument();
    });

    it('should render all card components', () => {
      const definition = createMockDefinition();
      const stats = createMockStats();
      const config = createMockConfig();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
          stats={stats}
          config={config}
        />
      );

      expect(screen.getByTestId('failure-store-retention-card')).toBeInTheDocument();
      expect(screen.getByTestId('failure-store-storage-card')).toBeInTheDocument();
      expect(screen.getByTestId('failure-store-ingestion-card')).toBeInTheDocument();
      expect(screen.getByTestId('failure-store-ingestion-rate')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('should pass correct props to RetentionCard', () => {
      const definition = createMockDefinition('logs-application');
      const config = createMockConfig();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
          config={config}
        />
      );

      expect(screen.getByText('Stream: logs-application')).toBeInTheDocument();
      expect(screen.getByText('Failure Store Enabled: true')).toBeInTheDocument();
    });

    it('should pass correct props to StorageSizeCard', () => {
      const definition = createMockDefinition('logs-database');
      const stats = createMockStats();
      const statsError = new Error('Network error');

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={statsError}
          isLoadingStats={false}
          stats={stats}
        />
      );

      const storageCard = screen.getByTestId('failure-store-storage-card');
      expect(storageCard).toHaveTextContent('Stream: logs-database');
      expect(storageCard).toHaveTextContent('Size: 1000000');
      expect(storageCard).toHaveTextContent('Error: Network error');
    });

    it('should pass correct props to IngestionCard', () => {
      const definition = createMockDefinition('logs-web');
      const stats = createMockStats();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
          stats={stats}
        />
      );

      const ingestionCard = screen.getByTestId('failure-store-ingestion-card');
      expect(ingestionCard).toHaveTextContent('Stream: logs-web');
      expect(ingestionCard).toHaveTextContent('Docs: 5000');
      expect(ingestionCard).toHaveTextContent('Error: None');
    });

    it('should pass correct props to FailureStoreIngestionRate', () => {
      const definition = createMockDefinition('logs-api');
      const stats = createMockStats();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={true}
          stats={stats}
        />
      );

      const ingestionRate = screen.getByTestId('failure-store-ingestion-rate');
      expect(ingestionRate).toHaveTextContent('Stream: logs-api');
      expect(ingestionRate).toHaveTextContent('Loading: true');
      expect(ingestionRate).toHaveTextContent('Has Stats: true');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined stats', () => {
      const definition = createMockDefinition();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      const storageCard = screen.getByTestId('failure-store-storage-card');
      const ingestionCard = screen.getByTestId('failure-store-ingestion-card');
      
      expect(storageCard).toHaveTextContent('Size: No data');
      expect(ingestionCard).toHaveTextContent('Docs: No data');
    });

    it('should handle undefined config', () => {
      const definition = createMockDefinition();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      const retentionCard = screen.getByTestId('failure-store-retention-card');
      expect(retentionCard).toHaveTextContent('Failure Store Enabled: undefined');
    });

    it('should display stats error correctly', () => {
      const definition = createMockDefinition();
      const statsError = new Error('Failed to load failure store stats');

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={statsError}
          isLoadingStats={false}
        />
      );

      const storageCard = screen.getByTestId('failure-store-storage-card');
      const ingestionCard = screen.getByTestId('failure-store-ingestion-card');
      
      expect(storageCard).toHaveTextContent('Error: Failed to load failure store stats');
      expect(ingestionCard).toHaveTextContent('Error: Failed to load failure store stats');
    });
  });

  describe('Modal Integration', () => {
    it('should call openModal when retention edit button is clicked', async () => {
      const definition = createMockDefinition();
      
      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      const editButton = screen.getByText('Edit Retention');
      editButton.click();

      expect(mockOpenModal).toHaveBeenCalledWith(true);
    });
  });

  describe('Loading States', () => {
    it('should handle loading state correctly', () => {
      const definition = createMockDefinition();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={true}
        />
      );

      const ingestionRate = screen.getByTestId('failure-store-ingestion-rate');
      expect(ingestionRate).toHaveTextContent('Loading: true');
    });

    it('should handle non-loading state correctly', () => {
      const definition = createMockDefinition();

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      const ingestionRate = screen.getByTestId('failure-store-ingestion-rate');
      expect(ingestionRate).toHaveTextContent('Loading: false');
    });
  });

  describe('Layout', () => {
    it('should render cards in correct flex layout', () => {
      const definition = createMockDefinition();
      const { container } = render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
        />
      );

      // Check that cards are within a flex group
      const flexGroup = container.querySelector('[class*="euiFlexGroup"]');
      expect(flexGroup).toBeInTheDocument();
      
      // All cards should be present
      expect(screen.getByTestId('failure-store-retention-card')).toBeInTheDocument();
      expect(screen.getByTestId('failure-store-storage-card')).toBeInTheDocument();
      expect(screen.getByTestId('failure-store-ingestion-card')).toBeInTheDocument();
    });
  });

  describe('Configuration Variations', () => {
    it('should handle disabled failure store configuration', () => {
      const definition = createMockDefinition();
      const config: FailureStore = {
        enabled: false,
        retentionPeriod: {
          default: '30d',
        },
      };

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
          config={config}
        />
      );

      const retentionCard = screen.getByTestId('failure-store-retention-card');
      expect(retentionCard).toHaveTextContent('Failure Store Enabled: false');
    });

    it('should handle custom retention period configuration', () => {
      const definition = createMockDefinition();
      const config: FailureStore = {
        enabled: true,
        retentionPeriod: {
          default: '30d',
          custom: '14d',
        },
      };

      render(
        <FailureStoreInfo
          openModal={mockOpenModal}
          definition={definition}
          statsError={undefined}
          isLoadingStats={false}
          config={config}
        />
      );

      // The retention card should receive the config and display it appropriately
      expect(screen.getByTestId('failure-store-retention-card')).toBeInTheDocument();
    });
  });
});