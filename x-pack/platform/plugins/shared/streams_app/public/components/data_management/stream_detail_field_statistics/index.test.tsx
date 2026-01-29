/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StreamDetailFieldStatistics } from '.';
import { useFieldStatistics } from './hooks/use_field_statistics';

jest.mock('./hooks/use_field_statistics');
jest.mock('@kbn/charts-theme', () => ({
  useElasticChartsTheme: () => ({}),
}));
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (
      key: string,
      { defaultMessage, values }: { defaultMessage: string; values?: Record<string, any> }
    ) => {
      if (!values) return defaultMessage;
      // Simple template replacement for values
      return Object.entries(values).reduce(
        (msg, [k, v]) => msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        defaultMessage
      );
    },
    getLocale: () => 'en',
  },
}));

const mockUseFieldStatistics = useFieldStatistics as jest.MockedFunction<typeof useFieldStatistics>;

const mockDefinition = {
  stream: {
    name: 'test-stream',
  },
  privileges: {
    view_index_metadata: true,
    manage: true,
  },
} as any;

const mockFieldData = {
  isSupported: true,
  fields: [
    {
      name: '@timestamp',
      total_in_bytes: 15000000,
      inverted_index_in_bytes: 0,
      stored_fields_in_bytes: 5000000,
      doc_values_in_bytes: 10000000,
      points_in_bytes: 0,
      norms_in_bytes: 0,
      term_vectors_in_bytes: 0,
      knn_vectors_in_bytes: 0,
    },
    {
      name: 'message',
      total_in_bytes: 8000000,
      inverted_index_in_bytes: 5000000,
      stored_fields_in_bytes: 3000000,
      doc_values_in_bytes: 0,
      points_in_bytes: 0,
      norms_in_bytes: 0,
      term_vectors_in_bytes: 0,
      knn_vectors_in_bytes: 0,
    },
    {
      name: 'host.name',
      total_in_bytes: 3000000,
      inverted_index_in_bytes: 1000000,
      stored_fields_in_bytes: 1000000,
      doc_values_in_bytes: 1000000,
      points_in_bytes: 0,
      norms_in_bytes: 0,
      term_vectors_in_bytes: 0,
      knn_vectors_in_bytes: 0,
    },
  ],
  totalFields: 3,
};

describe('StreamDetailFieldStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should render loading spinner when loading', () => {
      mockUseFieldStatistics.mockReturnValue({
        data: undefined,
        isLoading: true,
        refresh: jest.fn(),
        error: undefined,
      });

      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should render error callout when there is an error', () => {
      const mockError = new Error('Failed to fetch');
      mockUseFieldStatistics.mockReturnValue({
        data: undefined,
        isLoading: false,
        refresh: jest.fn(),
        error: mockError,
      });

      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByText('Error loading field statistics')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  describe('unsupported state (serverless)', () => {
    it('should render unsupported callout when isSupported is false', () => {
      mockUseFieldStatistics.mockReturnValue({
        data: {
          isSupported: false,
          fields: [],
          totalFields: 0,
        },
        isLoading: false,
        refresh: jest.fn(),
        error: undefined,
      });

      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByText('Field disk usage not available')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Field disk usage statistics are not available in this environment. This feature requires a self-managed Elasticsearch deployment.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty callout when no fields are available', () => {
      mockUseFieldStatistics.mockReturnValue({
        data: {
          isSupported: true,
          fields: [],
          totalFields: 0,
        },
        isLoading: false,
        refresh: jest.fn(),
        error: undefined,
      });

      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByText('No field disk usage available')).toBeInTheDocument();
    });
  });

  describe('success state with data', () => {
    beforeEach(() => {
      mockUseFieldStatistics.mockReturnValue({
        data: mockFieldData,
        isLoading: false,
        refresh: jest.fn(),
        error: undefined,
      });
    });

    it('should render chart and table when data is available', () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByText('Field disk usage overview')).toBeInTheDocument();
      expect(screen.getByText('Field statistics')).toBeInTheDocument();
      expect(screen.getByText('3 fields total')).toBeInTheDocument();
    });

    it('should render table with field data', () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('host.name')).toBeInTheDocument();
    });

    it('should filter fields based on search query', async () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      const searchInput = screen.getByTestId('fieldStatisticsSearch');
      fireEvent.change(searchInput, { target: { value: 'message' } });

      await waitFor(() => {
        expect(screen.getByText('message')).toBeInTheDocument();
        expect(screen.queryByText('@timestamp')).not.toBeInTheDocument();
        expect(screen.queryByText('host.name')).not.toBeInTheDocument();
      });
    });

    it('should filter fields case-insensitively', async () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      const searchInput = screen.getByTestId('fieldStatisticsSearch');
      fireEvent.change(searchInput, { target: { value: 'HOST' } });

      await waitFor(() => {
        expect(screen.getByText('host.name')).toBeInTheDocument();
        expect(screen.queryByText('@timestamp')).not.toBeInTheDocument();
        expect(screen.queryByText('message')).not.toBeInTheDocument();
      });
    });

    it('should show no results when search does not match any fields', async () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      const searchInput = screen.getByTestId('fieldStatisticsSearch');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.queryByText('@timestamp')).not.toBeInTheDocument();
        expect(screen.queryByText('message')).not.toBeInTheDocument();
        expect(screen.queryByText('host.name')).not.toBeInTheDocument();
      });
    });

    it('should have sortable columns', () => {
      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      // Check that column headers are present
      expect(screen.getByText('Field name')).toBeInTheDocument();
      expect(screen.getByText('Total disk usage')).toBeInTheDocument();
      expect(screen.getByText('Doc values')).toBeInTheDocument();
      expect(screen.getByText('Stored fields')).toBeInTheDocument();
    });
  });

  describe('hook integration', () => {
    it('should call useFieldStatistics with correct stream name', () => {
      mockUseFieldStatistics.mockReturnValue({
        data: mockFieldData,
        isLoading: false,
        refresh: jest.fn(),
        error: undefined,
      });

      render(<StreamDetailFieldStatistics definition={mockDefinition} />);

      expect(mockUseFieldStatistics).toHaveBeenCalledWith({
        streamName: 'test-stream',
      });
    });
  });
});
