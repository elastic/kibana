/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetentionCard } from './retention_card';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';

// Mock the redirect link hook
const mockHref = '/app/discover#/?_g=...';

jest.mock('../../hooks/use_failure_store_redirect_link', () => ({
  useFailureStoreRedirectLink: () => ({
    href: mockHref,
  }),
}));

// Mock the format size units helper
jest.mock('../../helpers/format_size_units', () => ({
  getTimeSizeAndUnitLabel: jest.fn((value: string | undefined) => {
    if (!value) return undefined;
    if (value === '7d') return '7 days';
    if (value === '30d') return '30 days';
    if (value === '1h') return '1 hour';
    return value;
  }),
}));

describe('FailureStore RetentionCard', () => {
  const mockOpenModal = jest.fn();

  const createMockDefinition = (
    privileges = { manage_failure_store: true }
  ): Streams.ingest.all.GetResponse => ({
    stream: { name: 'test-stream' },
    privileges,
  } as unknown as Streams.ingest.all.GetResponse);

  const createMockFailureStore = (
    custom = false,
    retentionPeriod = '7d'
  ): FailureStore => ({
    retentionPeriod: {
      custom,
      value: retentionPeriod,
    },
  } as FailureStore);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Conditions', () => {
    it('returns null when failureStore is not provided', () => {
      const definition = createMockDefinition();

      const { container } = render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={undefined}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('returns null when retentionPeriod is not provided', () => {
      const definition = createMockDefinition();
      const failureStore = {} as FailureStore;

      const { container } = render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders card when failureStore and retentionPeriod are provided', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByText('Failure retention')).toBeInTheDocument();
    });
  });

  describe('Custom Retention Period', () => {
    it('displays custom retention period with correct label', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore(true, '7d');

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByText('Failure retention')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('Custom retention period')).toBeInTheDocument();
      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
    });

    it('handles various custom retention periods', () => {
      const testCases = [
        { retention: '30d', expected: '30 days' },
        { retention: '1h', expected: '1 hour' },
        { retention: '14d', expected: '14d' }, // Falls back to original value when no mapping
      ];

      testCases.forEach(({ retention, expected }) => {
        const definition = createMockDefinition();
        const failureStore = createMockFailureStore(true, retention);

        const { rerender } = render(
          <RetentionCard
            openModal={mockOpenModal}
            definition={definition}
            failureStore={failureStore}
          />
        );

        expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent(expected);
        expect(screen.getByText('Custom retention period')).toBeInTheDocument();

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Default Retention Period', () => {
    it('displays default retention period with correct label', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore(false, '30d');

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByText('Failure retention')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText('Default retention period')).toBeInTheDocument();
      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('30 days');
    });

    it('handles various default retention periods', () => {
      const testCases = [
        { retention: '7d', expected: '7 days' },
        { retention: '1h', expected: '1 hour' },
      ];

      testCases.forEach(({ retention, expected }) => {
        const definition = createMockDefinition();
        const failureStore = createMockFailureStore(false, retention);

        const { rerender } = render(
          <RetentionCard
            openModal={mockOpenModal}
            definition={definition}
            failureStore={failureStore}
          />
        );

        expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent(expected);
        expect(screen.getByText('Default retention period')).toBeInTheDocument();

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Actions and Privileges', () => {
    it('renders edit action when user has manage_failure_store privilege', () => {
      const definition = createMockDefinition({ manage_failure_store: true });
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit failure store retention' });
      expect(editButton).toBeInTheDocument();
      expect(editButton).not.toBeDisabled();
    });

    it('does not render edit action when user lacks manage_failure_store privilege', () => {
      const definition = createMockDefinition({ manage_failure_store: false });
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.queryByRole('button', { name: 'Edit failure store retention' })).not.toBeInTheDocument();
    });

    it('calls openModal when edit button is clicked', async () => {
      const definition = createMockDefinition({ manage_failure_store: true });
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit failure store retention' });
      await userEvent.click(editButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
      expect(mockOpenModal).toHaveBeenCalledWith(true);
    });

    it('renders view in Discover action', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      const discoverButton = screen.getByTestId('streamFailureStoreViewInDiscover');
      expect(discoverButton).toBeInTheDocument();
      expect(discoverButton).toHaveAttribute('href', mockHref);
      expect(discoverButton).toHaveAttribute('aria-label', 'View in Discover');
    });

    it('renders both actions when user has manage privileges', () => {
      const definition = createMockDefinition({ manage_failure_store: true });
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByRole('button', { name: 'Edit failure store retention' })).toBeInTheDocument();
      expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
    });
  });

  describe('Data Test Subjects', () => {
    it('includes correct data-test-subj for failure store retention metric', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore(true, '7d');

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByTestId('failureStoreRetention-metric')).toBeInTheDocument();
      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
    });

    it('includes correct data-test-subj for view in Discover link', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      const discoverLink = screen.getByTestId('streamFailureStoreViewInDiscover');
      expect(discoverLink).toBeInTheDocument();
    });
  });

  describe('Integration with Redirect Link Hook', () => {
    it('uses href from useFailureStoreRedirectLink hook', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      const discoverLink = screen.getByTestId('streamFailureStoreViewInDiscover');
      expect(discoverLink).toHaveAttribute('href', mockHref);
    });

    it('passes definition to redirect link hook correctly', () => {
      const mockUseFailureStoreRedirectLink = require('../../hooks/use_failure_store_redirect_link');
      
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(mockUseFailureStoreRedirectLink.useFailureStoreRedirectLink).toHaveBeenCalledWith({
        definition,
      });
    });
  });

  describe('BaseMetricCard Integration', () => {
    it('passes correct title to BaseMetricCard', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore();

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(screen.getByText('Failure retention')).toBeInTheDocument();
    });

    it('passes correct metric data structure to BaseMetricCard', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore(true, '7d');

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      // Metric should have the retention value as data
      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
      
      // Subtitle should have the retention type
      expect(screen.getByText('Custom retention period')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined retentionPeriod value gracefully', () => {
      const definition = createMockDefinition();
      const failureStore = {
        retentionPeriod: {
          custom: true,
          value: undefined,
        },
      } as FailureStore;

      const { container } = render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles empty string retentionPeriod value', () => {
      const definition = createMockDefinition();
      const failureStore = createMockFailureStore(true, '');

      render(
        <RetentionCard
          openModal={mockOpenModal}
          definition={definition}
          failureStore={failureStore}
        />
      );

      // Should still render since empty string is truthy for existence check
      expect(screen.getByText('Failure retention')).toBeInTheDocument();
    });
  });
});