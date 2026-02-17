/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { Relationship } from '@kbn/streams-schema';
import { RelatedStreamsSection } from './related_streams_section';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_kibana');

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('RelatedStreamsSection', () => {
  const mockRouterLink = jest.fn((path: string, params: any) => {
    const { key, tab, rangeFrom, rangeTo } = params.path;
    return `/app/streams/${key}/management/${tab}?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`;
  });

  const mockStreamsRepositoryClient = {
    fetch: jest.fn(),
  };

  const mockNotifications = {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStreamsAppRouter.mockReturnValue({
      link: mockRouterLink,
    } as any);

    mockUseTimeRange.mockReturnValue({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    } as any);

    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: mockStreamsRepositoryClient,
          },
        },
      },
      core: {
        notifications: mockNotifications,
      },
    } as any);
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={true}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty prompt when no relationships', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByText('No related streams')).toBeInTheDocument();
    });

    it('should show add button in empty state when user can manage', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByTestId('streamsAppAddRelationshipButton')).toBeInTheDocument();
    });

    it('should not show add button in empty state when user cannot manage', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={false}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.queryByTestId('streamsAppAddRelationshipButton')).not.toBeInTheDocument();
    });
  });

  describe('Relationships Table', () => {
    const mockRelationships: Relationship[] = [
      {
        from_stream: 'test-stream',
        to_stream: 'related-stream-1',
        direction: 'bidirectional',
        source: 'manual',
        description: 'Test relationship',
      },
      {
        from_stream: 'test-stream',
        to_stream: 'related-stream-2',
        direction: 'directional',
        source: 'auto_detected',
        description: 'Auto detected relationship',
        confidence: 0.85,
      },
    ];

    it('should display relationships in table', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={mockRelationships}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByTestId('streamsAppRelatedStreamsTable')).toBeInTheDocument();
      expect(screen.getByText('related-stream-1')).toBeInTheDocument();
      expect(screen.getByText('related-stream-2')).toBeInTheDocument();
    });

    it('should display direction badges correctly', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={mockRelationships}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByText('Bidirectional')).toBeInTheDocument();
      expect(screen.getByText('Directional')).toBeInTheDocument();
    });

    it('should display source badges correctly', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={mockRelationships}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('Auto-detected')).toBeInTheDocument();
    });

    it('should display confidence for auto-detected relationships', () => {
      renderWithProviders(
        <RelatedStreamsSection
          relationships={mockRelationships}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Add Relationship Flyout', () => {
    it('should open flyout when add button is clicked', async () => {
      const user = userEvent.setup();

      mockStreamsRepositoryClient.fetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams') {
          return Promise.resolve({ streams: [] });
        }
        if (endpoint === 'GET /internal/streams/{name}/relationships/_suggestions') {
          return Promise.resolve({ suggestions: [] });
        }
        return Promise.resolve({});
      });

      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('streamsAppAddRelationshipButton'));

      await waitFor(() => {
        expect(screen.getByTestId('streamsAppAddRelationshipFlyout')).toBeInTheDocument();
      });
    });

    it('should load relationship suggestions when flyout opens', async () => {
      const user = userEvent.setup();

      mockStreamsRepositoryClient.fetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams') {
          return Promise.resolve({ streams: [] });
        }
        if (endpoint === 'GET /internal/streams/{name}/relationships/_suggestions') {
          return Promise.resolve({
            suggestions: [
              {
                from_stream: 'test-stream',
                to_stream: 'suggested-stream',
                confidence: 0.75,
                shared_fields: [
                  { name: 'host.name', type: 'keyword', otherType: 'keyword', isCorrelationField: true, correlationWeight: 1 },
                ],
                description: 'Shared host.name field',
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('streamsAppAddRelationshipButton'));

      await waitFor(() => {
        expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
          'GET /internal/streams/{name}/relationships/_suggestions',
          expect.objectContaining({
            params: expect.objectContaining({
              path: { name: 'test-stream' },
            }),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('suggested-stream')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should display shared fields badges in suggestions', async () => {
      const user = userEvent.setup();

      mockStreamsRepositoryClient.fetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams') {
          return Promise.resolve({ streams: [] });
        }
        if (endpoint === 'GET /internal/streams/{name}/relationships/_suggestions') {
          return Promise.resolve({
            suggestions: [
              {
                from_stream: 'test-stream',
                to_stream: 'suggested-stream',
                confidence: 0.75,
                shared_fields: [
                  { name: 'host.name', type: 'keyword', otherType: 'keyword', isCorrelationField: true, correlationWeight: 1 },
                  { name: 'service.name', type: 'keyword', otherType: 'keyword', isCorrelationField: true, correlationWeight: 1 },
                ],
                description: 'Shared correlation fields',
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('streamsAppAddRelationshipButton'));

      await waitFor(() => {
        expect(screen.getByText('host.name')).toBeInTheDocument();
        expect(screen.getByText('service.name')).toBeInTheDocument();
      });
    });

    it('should pre-fill form when selecting a suggestion', async () => {
      const user = userEvent.setup();

      mockStreamsRepositoryClient.fetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams') {
          return Promise.resolve({
            streams: [
              { stream: { name: 'suggested-stream' } },
              { stream: { name: 'other-stream' } },
            ],
          });
        }
        if (endpoint === 'GET /internal/streams/{name}/relationships/_suggestions') {
          return Promise.resolve({
            suggestions: [
              {
                from_stream: 'test-stream',
                to_stream: 'suggested-stream',
                confidence: 0.75,
                shared_fields: [],
                description: 'Auto-generated description',
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={jest.fn()}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('streamsAppAddRelationshipButton'));

      await waitFor(() => {
        expect(screen.getByTestId('streamsAppRelationshipSuggestion-suggested-stream')).toBeInTheDocument();
      });

      // Click on the suggestion
      await user.click(screen.getByTestId('streamsAppRelationshipSuggestion-suggested-stream'));

      // The suggestion should now be selected
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('should call onLink with correct relationship when adding via suggestion', async () => {
      const user = userEvent.setup();
      const mockOnLink = jest.fn().mockResolvedValue(undefined);

      mockStreamsRepositoryClient.fetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams') {
          return Promise.resolve({
            streams: [
              { stream: { name: 'suggested-stream' } },
            ],
          });
        }
        if (endpoint === 'GET /internal/streams/{name}/relationships/_suggestions') {
          return Promise.resolve({
            suggestions: [
              {
                from_stream: 'test-stream',
                to_stream: 'suggested-stream',
                confidence: 0.75,
                shared_fields: [],
                description: 'Suggested description',
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      renderWithProviders(
        <RelatedStreamsSection
          relationships={[]}
          loading={false}
          streamName="test-stream"
          canManage={true}
          onUnlink={jest.fn()}
          onLink={mockOnLink}
          onRefresh={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('streamsAppAddRelationshipButton'));

      await waitFor(() => {
        expect(screen.getByTestId('streamsAppAddRelationshipFlyout')).toBeInTheDocument();
      });

      // Wait for suggestions to load and click on a suggestion
      await waitFor(() => {
        expect(screen.getByTestId('streamsAppRelationshipSuggestion-suggested-stream')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('streamsAppRelationshipSuggestion-suggested-stream'));

      // Click add button
      await user.click(screen.getByTestId('streamsAppAddRelationshipConfirmButton'));

      await waitFor(() => {
        expect(mockOnLink).toHaveBeenCalledWith({
          from_stream: 'test-stream',
          to_stream: 'suggested-stream',
          direction: 'bidirectional',
          source: 'manual',
          description: 'Suggested description',
        });
      });
    });
  });
});
