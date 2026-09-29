/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AddToTimelineButton, SECURITY_APP_NAME } from './add_to_timeline_button';
import { TestProvidersWithServices } from '../__test_helpers__/create_mock_kibana_services';

const mockUseKibana = vi.fn();

vi.mock('../common/lib/kibana', async () => {
  const mocked = {
    ...(await vi.importActual('../common/lib/kibana')),
    useKibana: () => mockUseKibana(),
  };

  return { ...mocked, default: mocked };
});

const setupKibana = (appName: string = SECURITY_APP_NAME) => {
  mockUseKibana.mockReturnValue({
    services: {
      appName,
      application: {
        capabilities: {
          osquery: {
            writeLiveQueries: true,
            runSavedQueries: true,
            readPacks: true,
            writePacks: true,
            readSavedQueries: true,
            writeSavedQueries: true,
          },
        },
      },
    },
  });
};

describe('AddToTimelineButton', () => {
  const mockAddToTimeline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupKibana();
  });

  describe('visibility', () => {
    it('should render when in Security app with valid props', () => {
      render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value="test-action-id"
            addToTimeline={mockAddToTimeline}
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Timeline investigation')).toBeInTheDocument();
    });

    it('should not render when appName is not Security', () => {
      setupKibana('osquery');

      const { container } = render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value="test-action-id"
            addToTimeline={mockAddToTimeline}
          />
        </TestProvidersWithServices>
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when addToTimeline is undefined', () => {
      const { container } = render(
        <TestProvidersWithServices>
          <AddToTimelineButton field="action_id" value="test-action-id" />
        </TestProvidersWithServices>
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should not render when value is empty array', () => {
      const { container } = render(
        <TestProvidersWithServices>
          <AddToTimelineButton field="action_id" value={[]} addToTimeline={mockAddToTimeline} />
        </TestProvidersWithServices>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('interactions', () => {
    it('should call addToTimeline with correct providers on click', () => {
      render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value="test-action-id"
            addToTimeline={mockAddToTimeline}
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('Add to Timeline investigation'));

      expect(mockAddToTimeline).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-action-id',
          queryMatch: {
            field: 'action_id',
            value: 'test-action-id',
            operator: ':',
          },
        }),
      ]);
    });

    it('should handle array values by creating multiple providers', () => {
      render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value={['id-1', 'id-2']}
            addToTimeline={mockAddToTimeline}
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('Add to Timeline investigation'));

      expect(mockAddToTimeline).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'id-1' }),
        expect.objectContaining({ id: 'id-2' }),
      ]);
    });
  });

  describe('render variants', () => {
    it('should render as icon button when isIcon is true', () => {
      render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value="test-action-id"
            addToTimeline={mockAddToTimeline}
            isIcon
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByTestId('add-to-timeline')).toBeInTheDocument();
      expect(screen.queryByText('Add to Timeline investigation')).not.toBeInTheDocument();
    });

    it('should render as context menu item when displayAsMenuItem is true', () => {
      render(
        <TestProvidersWithServices>
          <AddToTimelineButton
            field="action_id"
            value="test-action-id"
            addToTimeline={mockAddToTimeline}
            displayAsMenuItem
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Timeline investigation')).toBeInTheDocument();
      expect(screen.getByTestId('add-to-timeline')).toBeInTheDocument();
    });
  });
});
