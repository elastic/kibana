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

      expect(screen.getByTestId('retentionCard-title')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppLifecycleBadgeIlmPolicyNameLink')).toHaveTextContent(
        'my-ilm-policy'
      );
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('ILM policy');
    });

    it('shows inherit label for wired child inheriting', () => {
      const definition: Streams.WiredStream.GetResponse = {
        stream: {
          name: 'logs-test.child',
          description: '',
          updated_at: new Date().toISOString(),
          ingest: {
            lifecycle: { inherit: {} }, // child is inheriting -> should show "Inherit from parent"
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            wired: { fields: {}, routing: [] },
            failure_store: { inherit: {} },
          },
        },
        // Effective lifecycle for wired streams must include a `from` field
        effective_lifecycle: { ilm: { policy: 'test-policy' }, from: 'logs-test' },
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
          view_index_metadata: true,
        },
        effective_failure_store: {
          lifecycle: { enabled: { is_default_retention: true } },
          from: 'logs-test',
        },
      };

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent(
        'ILM policy · Inherit from parent'
      );
    });
    it('shows override label for non-inheriting wired child', () => {
      // Non-inheriting wired stream: ingest.lifecycle is not inherit, effective lifecycle still ILM
      const definition: Streams.WiredStream.GetResponse = {
        stream: {
          name: 'logs-test.child',
          description: '',
          updated_at: new Date().toISOString(),
          ingest: {
            lifecycle: { ilm: { policy: 'test-policy' } }, // override -> should show "Override parent"
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            wired: { fields: {}, routing: [] },
            failure_store: { inherit: {} },
          },
        },
        effective_lifecycle: { ilm: { policy: 'test-policy' }, from: 'logs-test' },
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
          view_index_metadata: true,
        },
        effective_failure_store: {
          lifecycle: { enabled: { is_default_retention: true } },
          from: 'logs-test',
        },
      };

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent(
        'ILM policy · Override parent'
      );
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

      expect(screen.getByTestId('retentionCard-title')).toBeInTheDocument();
      expect(screen.getByTestId('retention-metric')).toHaveTextContent('30 days');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Custom period');
    });

    it('renders indefinite symbol when no data_retention', () => {
      const definition = createMockDefinition({
        dsl: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('∞');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Indefinite');
    });

    it('shows inherit label for classic streams inheriting', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { inherit: {} },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent(
        'Inherit from index template'
      );
    });

    it('shows override label for non-inheriting classic streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '7d' } },
        { dsl: { data_retention: '7d' } },
        'logs-test'
      );

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent(
        'Override index template'
      );
    });
  });

  describe('Disabled lifecycle', () => {
    it('renders disabled state with infinity symbol', () => {
      const definition = createMockDefinition({
        disabled: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('∞');
      expect(screen.getByTestId('retention-metric-subtitle')).toHaveTextContent('Disabled');
    });
  });

  describe('Unknown lifecycle', () => {
    it('renders em dash for unknown lifecycle', () => {
      const definition = createMockDefinition({
        unknown: {},
      });

      render(<RetentionCard definition={definition} openEditModal={mockOpenEditModal} />);

      expect(screen.getByTestId('retention-metric')).toHaveTextContent('—');
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
      expect(editButton).toHaveAttribute('aria-label', 'Edit retention method');
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

      const subtitle = screen.getByTestId('retention-metric-subtitle');
      expect(subtitle).not.toHaveTextContent('Inherit from parent');
      expect(subtitle).not.toHaveTextContent('Override parent');
    });
  });
});
