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

// Mock the IlmLink component
jest.mock('../ilm_link', () => ({
  IlmLink: ({ lifecycle }: { lifecycle: any }) => (
    <span data-testid="ilm-link">ILM Policy: {lifecycle.ilm?.policy}</span>
  ),
}));

// Mock the format size units helper
jest.mock('../../helpers/format_size_units', () => ({
  getTimeSizeAndUnitLabel: jest.fn((value: string | undefined) => {
    if (!value) return undefined;
    if (value === '30d') return '30 days';
    if (value === '7d') return '7 days';
    if (value === '1h') return '1 hour';
    return value;
  }),
}));

describe('RetentionCard', () => {
  const mockOpenEditModal = jest.fn();

  const createMockDefinition = (
    lifecycle: any,
    privileges = { lifecycle: true },
    streamName = 'test-stream'
  ): Streams.ingest.all.GetResponse => ({
    stream: {
      name: streamName,
      ingest: {
        lifecycle: { inherit: {} },
      },
    },
    effective_lifecycle: lifecycle,
    privileges,
    data_stream: undefined,
  } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ILM Lifecycle', () => {
    it('renders retention card with ILM policy data', () => {
      const ilmLifecycle = {
        ilm: { policy: 'test-ilm-policy' },
      };
      const definition = createMockDefinition(ilmLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByTestId('ilm-link')).toBeInTheDocument();
      expect(screen.getByText('ILM Policy: test-ilm-policy')).toBeInTheDocument();
      expect(screen.getByText('ILM policy')).toBeInTheDocument();
    });

    it('displays correct subtitle for ILM lifecycle', () => {
      const ilmLifecycle = {
        ilm: { policy: 'test-policy' },
      };
      const definition = createMockDefinition(ilmLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('ILM policy');
    });
  });

  describe('DSL Lifecycle', () => {
    it('renders retention card with custom retention period', () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = createMockDefinition(dslLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByTestId('retention-metric')).toHaveTextContent('30 days');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Custom period');
    });

    it('renders indefinite retention when no data_retention specified', () => {
      const dslLifecycle = {
        dsl: {},
      };
      const definition = createMockDefinition(dslLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('∞');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Indefinite');
    });

    it('handles various retention period formats', () => {
      const testCases = [
        { retention: '7d', expected: '7 days' },
        { retention: '1h', expected: '1 hour' },
      ];

      testCases.forEach(({ retention, expected }) => {
        const dslLifecycle = {
          dsl: { data_retention: retention },
        };
        const definition = createMockDefinition(dslLifecycle);

        const { rerender } = render(
          <RetentionCard definition={definition} openEditModal={mockOpenEditModal} />
        );

        expect(screen.getByTestId('retention-metric')).toHaveTextContent(expected);
        expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Custom period');

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Disabled Lifecycle', () => {
    it('renders disabled retention state', () => {
      const disabledLifecycle = {
        disabled: {},
      };
      const definition = createMockDefinition(disabledLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('∞');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Disabled');
    });
  });

  describe('Retention Origin Labels', () => {
    it('displays inherit from parent for wired non-root streams', () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = {
        ...createMockDefinition(dslLifecycle, { lifecycle: true }, 'logs.app'),
        stream: {
          ...createMockDefinition(dslLifecycle).stream,
          name: 'logs.app',
          ingest: {
            lifecycle: { inherit: {} },
          },
        },
      } as unknown as Streams.ingest.all.GetResponse;

      // Mock the WiredStream check
      jest.doMock('@kbn/streams-schema', () => ({
        ...jest.requireActual('@kbn/streams-schema'),
        Streams: {
          WiredStream: {
            GetResponse: {
              is: () => true,
            },
          },
        },
      }));

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent(
        'Custom period · Inherit from parent'
      );
    });

    it('displays override parent for wired non-root streams with override', () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = {
        ...createMockDefinition(dslLifecycle, { lifecycle: true }, 'logs.app'),
        stream: {
          ...createMockDefinition(dslLifecycle).stream,
          name: 'logs.app',
          ingest: {
            lifecycle: { dsl: { data_retention: '15d' } },
          },
        },
      } as unknown as Streams.ingest.all.GetResponse;

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Custom period');
    });
  });

  describe('Edit Button Functionality', () => {
    it('renders edit button when user has lifecycle privileges', () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = createMockDefinition(dslLifecycle, { lifecycle: true });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      expect(editButton).toBeInTheDocument();
      expect(editButton).not.toBeDisabled();
      expect(editButton).toHaveAttribute('aria-label', 'Edit data retention');
    });

    it('disables edit button when user lacks lifecycle privileges', () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = createMockDefinition(dslLifecycle, { lifecycle: false });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      expect(editButton).toBeDisabled();
    });

    it('calls openEditModal when edit button is clicked', async () => {
      const dslLifecycle = {
        dsl: { data_retention: '30d' },
      };
      const definition = createMockDefinition(dslLifecycle, { lifecycle: true });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      await userEvent.click(editButton);

      expect(mockOpenEditModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unknown Lifecycle States', () => {
    it('renders dash for unknown lifecycle types', () => {
      const unknownLifecycle = {};
      const definition = createMockDefinition(unknownLifecycle);

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('—');
    });
  });
});