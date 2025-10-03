/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams } from '@kbn/streams-schema';
import { RetentionCard } from './retention_card';

// Mock the IlmLink component
jest.mock('../ilm_link', () => ({
  IlmLink: ({ lifecycle }: { lifecycle: any }) => (
    <span data-test-subj="ilm-link">{lifecycle.ilm.policy}</span>
  ),
}));

describe('RetentionCard', () => {
  const mockOpenEditModal = jest.fn();

  const createMockDefinition = (
    effectiveLifecycle: any,
    ingestLifecycle: any = { inherit: {} },
    streamName: string = 'logs-test',
    privileges: any = { lifecycle: true }
  ): Streams.ingest.all.GetResponse => ({
    stream: {
      name: streamName,
      ingest: {
        lifecycle: ingestLifecycle,
      },
    },
    effective_lifecycle: effectiveLifecycle,
    privileges,
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ILM Lifecycle', () => {
    it('should display ILM policy information correctly', () => {
      const definition = createMockDefinition({
        ilm: {
          policy: 'my-ilm-policy',
        },
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByTestId('ilm-link')).toHaveTextContent('my-ilm-policy');
      expect(screen.getByText('ILM policy')).toBeInTheDocument();
    });

    it('should show inherit from parent label for wired streams', () => {
      const definition = createMockDefinition(
        { ilm: { policy: 'my-ilm-policy' } },
        { inherit: {} },
        'logs-test.child'
      );
      // Mock as wired stream
      (definition as any).__type = 'WiredStream';

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Inherit from parent')).toBeInTheDocument();
    });

    it('should show override parent label for non-inheriting wired streams', () => {
      const definition = createMockDefinition(
        { ilm: { policy: 'my-ilm-policy' } },
        { dsl: { data_retention: '30d' } },
        'logs-test.child'
      );
      // Mock as wired stream
      (definition as any).__type = 'WiredStream';

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Override parent')).toBeInTheDocument();
    });
  });

  describe('DSL Lifecycle', () => {
    it('should display custom retention period correctly', () => {
      const definition = createMockDefinition({
        dsl: {
          data_retention: '30d',
        },
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText('Custom period')).toBeInTheDocument();
    });

    it('should display indefinite retention when data_retention is not set', () => {
      const definition = createMockDefinition({
        dsl: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
      expect(screen.getByText('Indefinite')).toBeInTheDocument();
    });

    it('should show inherit from index template label for classic streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { inherit: {} },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Inherit from index template')).toBeInTheDocument();
    });

    it('should show override index template label for non-inheriting classic streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { dsl: { data_retention: '7d' } },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Override index template')).toBeInTheDocument();
    });
  });

  describe('Disabled Lifecycle', () => {
    it('should display disabled retention correctly', () => {
      const definition = createMockDefinition({
        disabled: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Unknown Lifecycle', () => {
    it('should display dash for unknown lifecycle types', () => {
      const definition = createMockDefinition({
        unknown: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('Edit Button', () => {
    it('should call openEditModal when edit button is clicked', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      await userEvent.click(editButton);

      expect(mockOpenEditModal).toHaveBeenCalledTimes(1);
    });

    it('should disable edit button when user lacks lifecycle privileges', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        undefined,
        'logs-test',
        { lifecycle: false }
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      expect(editButton).toBeDisabled();
    });

    it('should have proper accessibility attributes', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      expect(editButton).toHaveAttribute('aria-label', 'Edit data retention');
    });
  });

  describe('Root Stream Behavior', () => {
    it('should not show inheritance labels for root streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { dsl: { data_retention: '30d' } },
        'logs'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.queryByText('Inherit from parent')).not.toBeInTheDocument();
      expect(screen.queryByText('Override parent')).not.toBeInTheDocument();
    });
  });
});