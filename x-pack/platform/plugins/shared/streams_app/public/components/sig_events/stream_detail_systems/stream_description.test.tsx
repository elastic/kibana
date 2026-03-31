/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamDescription } from './stream_description';
import type { AIFeatures } from '../../../hooks/use_ai_features';

const mockUseStreamDescriptionApi = jest.fn();

jest.mock('./stream_description/use_stream_description_api', () => ({
  useStreamDescriptionApi: (...args: unknown[]) => mockUseStreamDescriptionApi(...args),
}));

jest.mock('./stream_description/description_generation_control', () => ({
  DescriptionGenerationControl: () => <button type="button">Generate description mock</button>,
}));

jest.mock(
  '../../stream_management/data_management/stream_detail_management/advanced_view/row',
  () => ({
    Row: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
      <div>
        <div data-testid="row-left">{left}</div>
        <div data-testid="row-right">{right}</div>
      </div>
    ),
  })
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

const createMockDefinition = (description?: string): Streams.all.GetResponse =>
  ({
    stream: {
      name: 'logs-test',
      description: description || '',
    },
    privileges: { manage: true, simulate: true, read: true },
  } as unknown as Streams.all.GetResponse);

const mockAiFeatures: AIFeatures = {
  loading: false,
  enabled: true,
  couldBeEnabled: true,
  genAiConnectors: { selectedConnector: 'test-connector' } as AIFeatures['genAiConnectors'],
  isManagedAIConnector: false,
  hasAcknowledgedAdditionalCharges: true,
  acknowledgeAdditionalCharges: jest.fn(),
};

const defaultApiReturn = {
  description: '',
  setDescription: jest.fn(),
  isUpdating: false,
  isEditing: false,
  onCancelEdit: jest.fn(),
  onStartEditing: jest.fn(),
  onSaveDescription: jest.fn(),
  isTaskLoading: false,
  task: undefined,
  taskError: null,
  refreshTask: jest.fn(),
  getDescriptionGenerationStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
  scheduleDescriptionGenerationTask: jest.fn(),
  cancelDescriptionGenerationTask: jest.fn(),
  acknowledgeDescriptionGenerationTask: jest.fn(),
  areButtonsDisabled: false,
};

describe('StreamDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamDescriptionApi.mockReturnValue(defaultApiReturn);
  });

  it('should render the panel title', () => {
    renderWithProviders(
      <StreamDescription
        definition={createMockDefinition()}
        refreshDefinition={jest.fn()}
        aiFeatures={null}
      />
    );

    expect(screen.getByText('Stream description')).toBeInTheDocument();
  });

  it('should show the "Enter manually" button when there is no description and not editing', () => {
    renderWithProviders(
      <StreamDescription
        definition={createMockDefinition()}
        refreshDefinition={jest.fn()}
        aiFeatures={null}
      />
    );

    expect(screen.getByText('Enter manually')).toBeInTheDocument();
  });

  describe('without AI features', () => {
    it('should NOT show the generate description button', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={null}
        />
      );

      expect(screen.queryByText('Generate description mock')).not.toBeInTheDocument();
    });

    it('should show only the basic help text', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={null}
        />
      );

      expect(
        screen.getByText('A natural language description of the data in this stream.')
      ).toBeInTheDocument();
      expect(screen.queryByText(/AI workflows/)).not.toBeInTheDocument();
    });

    it('should pass enableGeneration=false to the API hook', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={null}
        />
      );

      expect(mockUseStreamDescriptionApi).toHaveBeenCalledWith(
        expect.objectContaining({ enableGeneration: false })
      );
    });

    it('should pass enableGeneration=false when aiFeatures is present but not enabled', () => {
      const disabledAiFeatures: AIFeatures = {
        ...mockAiFeatures,
        enabled: false,
      };

      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={disabledAiFeatures}
        />
      );

      expect(mockUseStreamDescriptionApi).toHaveBeenCalledWith(
        expect.objectContaining({ enableGeneration: false })
      );
      expect(screen.queryByText('Generate description mock')).not.toBeInTheDocument();
    });

    it('should show the markdown editor when there is an existing description', () => {
      mockUseStreamDescriptionApi.mockReturnValue({
        ...defaultApiReturn,
        description: 'Test description',
      });

      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition('Test description')}
          refreshDefinition={jest.fn()}
          aiFeatures={null}
        />
      );

      expect(screen.queryByText('Enter manually')).not.toBeInTheDocument();
    });
  });

  describe('with AI features', () => {
    it('should show the generate description button when no description exists', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={mockAiFeatures}
        />
      );

      expect(screen.getByText('Generate description mock')).toBeInTheDocument();
    });

    it('should show the AI help text', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={mockAiFeatures}
        />
      );

      expect(screen.getByText(/AI workflows/)).toBeInTheDocument();
    });

    it('should pass enableGeneration=true to the API hook', () => {
      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition()}
          refreshDefinition={jest.fn()}
          aiFeatures={mockAiFeatures}
        />
      );

      expect(mockUseStreamDescriptionApi).toHaveBeenCalledWith(
        expect.objectContaining({ enableGeneration: true })
      );
    });

    it('should not show the generate description button when AI features are absent and description exists', () => {
      mockUseStreamDescriptionApi.mockReturnValue({
        ...defaultApiReturn,
        description: 'Test description',
        isEditing: true,
      });

      renderWithProviders(
        <StreamDescription
          definition={createMockDefinition('Test description')}
          refreshDefinition={jest.fn()}
          aiFeatures={null}
        />
      );

      expect(screen.queryByText('Generate description mock')).not.toBeInTheDocument();
    });
  });
});
