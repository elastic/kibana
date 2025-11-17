/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
import { RetentionCard } from './retention_card';

// Mock discover link hook with a simpler implementation
jest.mock('../../hooks/use_failure_store_redirect_link', () => ({
  useFailureStoreRedirectLink: () => ({ href: '/app/discover#/?_a=test' }),
}));

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const mockClassicDefinition: Streams.ClassicStream.GetResponse = {
  stream: {
    name: 'logs-test',
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      failure_store: { inherit: {} },
      classic: {},
    },
  },
  privileges: {
    lifecycle: true,
    manage: true,
    monitor: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
  },
  effective_lifecycle: {
    dsl: {},
  },
  effective_settings: {},
  effective_failure_store: {
    lifecycle: {
      data_retention: '30d',
    },
  },
  data_stream_exists: true,
  dashboards: [],
  queries: [],
  rules: [],
};

const mockWiredDefinition: Streams.WiredStream.GetResponse = {
  stream: {
    name: 'logs.nginx-test',
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      failure_store: { inherit: {} },
      wired: {
        fields: {},
        routing: [],
      },
    },
  },
  privileges: {
    lifecycle: true,
    manage: true,
    monitor: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
  },
  effective_lifecycle: {
    dsl: {},
    from: 'logs',
  },
  effective_failure_store: {
    lifecycle: {
      data_retention: '30d',
    },
    from: 'logs',
  },
  effective_settings: {},
  inherited_fields: {},
  dashboards: [],
  queries: [],
  rules: [],
};

const mockWiredRootDefinition: Streams.WiredStream.GetResponse = {
  ...mockWiredDefinition,
  stream: {
    name: 'logs',
    description: '',
    ingest: {
      lifecycle: { dsl: { data_retention: '30d' } },
      processing: { steps: [] },
      settings: {},
      failure_store: { lifecycle: { data_retention: '30d' } },
      wired: {
        fields: {},
        routing: [],
      },
    },
  },
  effective_lifecycle: {
    dsl: { data_retention: '30d' },
    from: 'logs',
  },
  effective_failure_store: {
    lifecycle: {
      data_retention: '30d',
    },
    from: 'logs',
  },
};

const mockWiredWithOverrideDefinition: Streams.WiredStream.GetResponse = {
  ...mockWiredDefinition,
  stream: {
    ...mockWiredDefinition.stream,
    ingest: {
      ...mockWiredDefinition.stream.ingest,
      failure_store: { lifecycle: { data_retention: '7d' } },
    },
  },
  effective_failure_store: {
    lifecycle: {
      data_retention: '7d',
    },
    from: 'logs.nginx-test',
  },
};

const mockClassicWithOverrideDefinition: Streams.ClassicStream.GetResponse = {
  ...mockClassicDefinition,
  stream: {
    ...mockClassicDefinition.stream,
    ingest: {
      ...mockClassicDefinition.stream.ingest,
      failure_store: { lifecycle: { data_retention: '14d' } },
    },
  },
  effective_failure_store: {
    lifecycle: {
      data_retention: '14d',
    },
  },
};

describe('RetentionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    { type: 'Classic', definition: mockClassicDefinition },
    { type: 'Wired', definition: mockWiredDefinition },
  ])('when $type Stream', ({ type, definition }) => {
    it('returns null when failureStore disabled', () => {
      const isWired = type === 'Wired';
      const disabledDefinition = {
        ...definition,
        effective_failure_store: isWired
          ? { disabled: {}, from: definition.stream.name }
          : { disabled: {} },
      };
      const { container } = renderI18n(
        <RetentionCard
          openModal={jest.fn()}
          canManageFailureStore={true}
          streamName="logs-test"
          defaultRetentionPeriod="30d"
          definition={disabledDefinition as any}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders custom retention metric and subtitle', () => {
      const customRetentionDefinition = {
        ...definition,
        effective_failure_store: {
          lifecycle: { data_retention: '7d' },
          from: definition.stream.name,
        },
      };
      renderI18n(
        <RetentionCard
          openModal={jest.fn()}
          canManageFailureStore={true}
          streamName="logs-test"
          defaultRetentionPeriod="30d"
          definition={customRetentionDefinition}
        />
      );

      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
      expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
        /Custom retention period/i
      );
    });

    it('renders default retention metric and subtitle', () => {
      const defaultRetentionDefinition = {
        ...definition,
        effective_failure_store: {
          lifecycle: {},
          from: definition.stream.name,
        },
      };
      renderI18n(
        <RetentionCard
          openModal={jest.fn()}
          canManageFailureStore={true}
          streamName="logs-test"
          defaultRetentionPeriod="30d"
          definition={defaultRetentionDefinition}
        />
      );

      expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('30 days');
      expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
        /Default retention period/i
      );
    });

    it('includes edit & discover actions when privileged', () => {
      const openModal = jest.fn();
      renderI18n(
        <RetentionCard
          openModal={openModal}
          canManageFailureStore={true}
          streamName="logs-test"
          defaultRetentionPeriod="30d"
          definition={definition}
        />
      );
      fireEvent.click(screen.getByTestId('streamFailureStoreEditRetention'));
      expect(openModal).toHaveBeenCalledWith(true);
      expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
    });

    it('omits edit action when lacking privilege', () => {
      renderI18n(
        <RetentionCard
          openModal={jest.fn()}
          canManageFailureStore={false}
          streamName="logs-test"
          defaultRetentionPeriod="30d"
          definition={definition}
        />
      );
      expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
      expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
    });
  });

  describe('Retention Origin Labels', () => {
    describe('Classic Stream', () => {
      it('shows "Inherit from index template" when failure store is inherited', () => {
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs-test"
            defaultRetentionPeriod="30d"
            definition={mockClassicDefinition}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Inherit from index template/i);
        expect(subtitle).not.toHaveTextContent(/Override index template/i);
      });

      it('shows "Override index template" when failure store is not inherited', () => {
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs-test"
            defaultRetentionPeriod="30d"
            definition={mockClassicWithOverrideDefinition}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Override index template/i);
        expect(subtitle).not.toHaveTextContent(/Inherit from index template/i);
      });
    });

    describe('Wired Stream', () => {
      it('shows "Inherit from parent" when failure store is inherited and not root', () => {
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs.nginx-test"
            defaultRetentionPeriod="30d"
            definition={mockWiredDefinition}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Inherit from parent/i);
        expect(subtitle).not.toHaveTextContent(/Override parent/i);
      });

      it('shows "Override parent" when failure store is not inherited and not root', () => {
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs.nginx-test"
            defaultRetentionPeriod="30d"
            definition={mockWiredWithOverrideDefinition}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Override parent/i);
        expect(subtitle).not.toHaveTextContent(/Inherit from parent/i);
      });

      it('does not show origin label for root stream with explicit failure store', () => {
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs"
            defaultRetentionPeriod="30d"
            definition={mockWiredRootDefinition}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).not.toHaveTextContent(/Inherit from parent/i);
        expect(subtitle).not.toHaveTextContent(/Override parent/i);
      });
    });
  });
});
