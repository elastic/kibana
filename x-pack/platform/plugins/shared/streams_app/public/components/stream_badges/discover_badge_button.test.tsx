/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
import { DiscoverBadgeButton } from '.';

const mockUseUrl = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        share: {
          url: {
            locators: {
              useUrl: mockUseUrl,
            },
          },
        },
      },
    },
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

const createWiredStreamDefinition = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: '2024-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    settings: {},
    processing: {
      updated_at: '2024-01-01T00:00:00.000Z',
      steps: [],
    },
    failure_store: { inherit: {} },
    wired: {
      fields: {},
      routing: [],
    },
  },
});

const createQueryStreamDefinition = (name: string): Streams.QueryStream.Definition => ({
  name,
  description: '',
  updated_at: '2024-01-01T00:00:00.000Z',
  query: {
    view: `view_${name}`,
    esql: `FROM logs | WHERE name = "${name}"`,
  },
});

describe('DiscoverBadgeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUrl.mockReturnValue('https://discover/link');
  });

  describe('with ingest stream', () => {
    it('renders button when hasDataStream is true and discoverLink is available', () => {
      const stream = createWiredStreamDefinition('logs.test');

      renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={true} indexMode={undefined} />
      );

      expect(screen.getByTestId('streamsDiscoverActionButton-logs.test')).toBeInTheDocument();
    });

    it('returns null when hasDataStream is false', () => {
      const stream = createWiredStreamDefinition('logs.test');

      const { container } = renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={false} indexMode={undefined} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('returns null when discoverLink is not available', () => {
      mockUseUrl.mockReturnValue(null);
      const stream = createWiredStreamDefinition('logs.test');

      const { container } = renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={true} indexMode={undefined} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders spelled out button when spellOut is true', () => {
      const stream = createWiredStreamDefinition('logs.test');

      renderWithProviders(
        <DiscoverBadgeButton
          stream={stream}
          hasDataStream={true}
          indexMode={undefined}
          spellOut={true}
        />
      );

      expect(screen.getByText('View in Discover')).toBeInTheDocument();
    });

    it('passes time_series indexMode to getDiscoverEsqlQuery', () => {
      const stream = createWiredStreamDefinition('logs.metrics');

      renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={true} indexMode="time_series" />
      );

      expect(mockUseUrl).toHaveBeenCalled();
      const callArgs = mockUseUrl.mock.calls[0];
      const locatorParamsFactory = callArgs[0];
      const params = locatorParamsFactory();
      expect(params.params.query.esql).toContain('TS ');
    });

    it('uses FROM command when indexMode is undefined', () => {
      const stream = createWiredStreamDefinition('logs.test');

      renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={true} indexMode={undefined} />
      );

      expect(mockUseUrl).toHaveBeenCalled();
      const callArgs = mockUseUrl.mock.calls[0];
      const locatorParamsFactory = callArgs[0];
      const params = locatorParamsFactory();
      expect(params.params.query.esql).toContain('FROM ');
      expect(params.params.query.esql).not.toContain('TS ');
    });
  });

  describe('with query stream', () => {
    it('renders button when hasDataStream is true', () => {
      const stream = createQueryStreamDefinition('logs.query');

      renderWithProviders(<DiscoverBadgeButton stream={stream} hasDataStream={true} />);

      expect(screen.getByTestId('streamsDiscoverActionButton-logs.query')).toBeInTheDocument();
    });

    it('uses FROM command with view name for query streams', () => {
      const stream = createQueryStreamDefinition('logs.query');

      renderWithProviders(<DiscoverBadgeButton stream={stream} hasDataStream={true} />);

      expect(mockUseUrl).toHaveBeenCalled();
      const callArgs = mockUseUrl.mock.calls[0];
      const locatorParamsFactory = callArgs[0];
      const params = locatorParamsFactory();
      expect(params.params.query.esql).toContain('FROM view_logs.query');
    });

    it('does not accept indexMode prop for query streams (TypeScript enforcement)', () => {
      const stream = createQueryStreamDefinition('logs.query');

      renderWithProviders(<DiscoverBadgeButton stream={stream} hasDataStream={true} />);

      expect(screen.getByTestId('streamsDiscoverActionButton-logs.query')).toBeInTheDocument();
    });
  });

  describe('type safety', () => {
    it('requires indexMode for ingest streams', () => {
      const stream = createWiredStreamDefinition('logs.test');

      renderWithProviders(
        <DiscoverBadgeButton stream={stream} hasDataStream={true} indexMode={undefined} />
      );

      expect(screen.getByTestId('streamsDiscoverActionButton-logs.test')).toBeInTheDocument();
    });

    it('forbids indexMode for query streams', () => {
      const stream = createQueryStreamDefinition('logs.query');

      renderWithProviders(<DiscoverBadgeButton stream={stream} hasDataStream={true} />);

      expect(screen.getByTestId('streamsDiscoverActionButton-logs.query')).toBeInTheDocument();
    });
  });
});
