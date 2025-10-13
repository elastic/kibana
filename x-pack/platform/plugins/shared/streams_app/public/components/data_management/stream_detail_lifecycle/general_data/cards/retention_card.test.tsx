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

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        share: {
          url: {
            locators: {
              get: () => ({
                getRedirectUrl: () => 'http://localhost/ilm',
              }),
            },
          },
        },
      },
    },
  }),
}));

describe('RetentionCard', () => {
  const mockOpenEditModal = jest.fn();

  const createMockDefinition = (
    effectiveLifecycle: any,
    ingestLifecycle: any = { inherit: {} },
    streamName: string = 'logs-test',
    privileges: any = { lifecycle: true }
  ): Streams.ingest.all.GetResponse =>
    ({
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

  describe('ILM lifecycle', () => {
    it('renders ILM policy name', () => {
      const definition = createMockDefinition({
        ilm: {
          policy: 'my-ilm-policy',
        },
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('my-ilm-policy')).toBeInTheDocument();
      expect(screen.getByText(/ILM policy/)).toBeInTheDocument();
    });

    it('shows inherit label for wired child inheriting', () => {
      // Build a minimal valid wired stream GetResponse so Streams.WiredStream.GetResponse.is(definition) passes
      const definition: any = {
        stream: {
          name: 'logs-test.child',
          description: '',
          ingest: {
            lifecycle: { inherit: {} }, // child is inheriting -> should show "Inherit from parent"
            processing: { steps: [] },
            settings: {},
            wired: { fields: {}, routing: [] },
          },
        },
        // Effective lifecycle for wired streams must include a `from` field
        effective_lifecycle: { ilm: { policy: 'my-ilm-policy' }, from: 'logs-test' },
        effective_settings: {},
        inherited_fields: {},
        dashboards: [],
        rules: [],
        queries: [],
        privileges: {
          manage: true,
          monitor: true,
          // lifecycle privilege is the only one the component actually checks, but the schema requires all
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
        },
      };

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText(/Inherit from parent/)).toBeInTheDocument();
    });
    it('shows override label for non-inheriting wired child', () => {
      // Non-inheriting wired stream: ingest.lifecycle is not inherit, effective lifecycle still ILM
      const definition: any = {
        stream: {
          name: 'logs-test.child',
          description: '',
          ingest: {
            lifecycle: { dsl: { data_retention: '30d' } }, // override -> should show "Override parent"
            processing: { steps: [] },
            settings: {},
            wired: { fields: {}, routing: [] },
          },
        },
        effective_lifecycle: { ilm: { policy: 'my-ilm-policy' }, from: 'logs-test' },
        effective_settings: {},
        inherited_fields: {},
        dashboards: [],
        rules: [],
        queries: [],
        privileges: {
          manage: true,
          monitor: true,
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
        },
      };

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText(/Override parent/)).toBeInTheDocument();
    });
  });

  describe('DSL lifecycle', () => {
    it('renders custom retention period in days', () => {
      const definition = createMockDefinition({
        dsl: {
          data_retention: '30d',
        },
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText(/Custom period/)).toBeInTheDocument();
    });

    it('renders indefinite symbol when no data_retention', () => {
      const definition = createMockDefinition({
        dsl: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
      expect(screen.getByText(/Indefinite/)).toBeInTheDocument();
    });

    it('shows inherit label for classic streams inheriting', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { inherit: {} },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText(/Inherit from index template/)).toBeInTheDocument();
    });

    it('shows override label for non-inheriting classic streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { dsl: { data_retention: '7d' } },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText(/Override index template/)).toBeInTheDocument();
    });
  });

  describe('Disabled lifecycle', () => {
    it('renders disabled state with infinity symbol', () => {
      const definition = createMockDefinition({
        disabled: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
      expect(screen.getByText(/Disabled/)).toBeInTheDocument();
    });
  });

  describe('Unknown lifecycle', () => {
    it('renders em dash for unknown lifecycle', () => {
      const definition = createMockDefinition({
        unknown: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('Edit interactions & privileges', () => {
    it('invokes openEditModal when edit button clicked', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      await userEvent.click(editButton);

      expect(mockOpenEditModal).toHaveBeenCalledTimes(1);
    });

    it('disables edit button without lifecycle privilege', () => {
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

    it('provides accessibility label on edit button', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      const editButton = screen.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton');
      expect(editButton).toHaveAttribute('aria-label', 'Edit data retention');
    });
  });

  describe('Root stream behavior', () => {
    it('hides parent inheritance labels for root streams', () => {
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
