/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  GenerateSuggestionButton,
  AdditionalChargesCallout,
  type GenerateSuggestionButtonProps,
} from './generate_suggestions_button';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import type { UseGenAIConnectorsResult, Connector } from '../../../../hooks/use_genai_connectors';

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      http: {
        basePath: {
          prepend: (path: string) => `/test${path}`,
        },
      },
      docLinks: {
        links: {
          observability: {
            elasticManagedLlmUsageCost: 'https://example.com/cost',
            elasticManagedLlm: 'https://example.com/learn-more',
          },
        },
      },
    },
  }),
}));

const createMockConnector = (id: string, name: string): Connector => ({
  id,
  name,
  actionTypeId: '.gen-ai',
});

const createMockGenAiConnectors = (
  overrides: Partial<UseGenAIConnectorsResult> = {}
): UseGenAIConnectorsResult => ({
  connectors: [createMockConnector('connector-1', 'Connector 1')],
  selectedConnector: 'connector-1',
  loading: false,
  error: undefined,
  selectConnector: jest.fn(),
  reloadConnectors: jest.fn(),
  isConnectorSelectionRestricted: false,
  defaultConnector: undefined,
  ...overrides,
});

const createMockAIFeatures = (overrides: Partial<AIFeatures> = {}): AIFeatures => ({
  loading: false,
  enabled: true,
  couldBeEnabled: true,
  genAiConnectors: createMockGenAiConnectors(),
  isManagedAIConnector: false,
  hasAcknowledgedAdditionalCharges: true,
  acknowledgeAdditionalCharges: jest.fn(),
  ...overrides,
});

describe('GenerateSuggestionButton', () => {
  const defaultProps: GenerateSuggestionButtonProps = {
    onClick: jest.fn(),
    aiFeatures: createMockAIFeatures(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when AI features are disabled', () => {
    it('renders nothing when AI features are disabled and cannot be enabled', () => {
      const aiFeatures = createMockAIFeatures({
        enabled: false,
        couldBeEnabled: false,
      });

      const { container } = render(
        <GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders a link to enable AI features when AI could be enabled', () => {
      const aiFeatures = createMockAIFeatures({
        enabled: false,
        couldBeEnabled: true,
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      const link = screen.getByRole('link', { name: /enable ai assistant features/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/test/app/management/insightsAndAlerting/triggersActionsConnectors/connectors'
      );
    });
  });

  describe('when AI features are enabled', () => {
    it('renders the generate button', () => {
      render(<GenerateSuggestionButton {...defaultProps} />);

      expect(screen.getByTestId('streamsAppGenerateSuggestionButton')).toBeInTheDocument();
    });

    it('calls onClick with the selected connector id when button is clicked', () => {
      const onClick = jest.fn();
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          selectedConnector: 'my-connector',
        }),
      });

      render(
        <GenerateSuggestionButton {...defaultProps} onClick={onClick} aiFeatures={aiFeatures} />
      );

      fireEvent.click(screen.getByTestId('streamsAppGenerateSuggestionButton'));

      expect(onClick).toHaveBeenCalledWith('my-connector');
    });

    it('disables the button when no connector is selected', () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          selectedConnector: undefined,
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      expect(screen.getByTestId('streamsAppGenerateSuggestionButton')).toBeDisabled();
    });

    it('disables the button when isDisabled prop is true', () => {
      render(<GenerateSuggestionButton {...defaultProps} isDisabled />);

      expect(screen.getByTestId('streamsAppGenerateSuggestionButton')).toBeDisabled();
    });
  });

  describe('connector selection popover', () => {
    it('does not render the more button when there is only one connector', () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [createMockConnector('connector-1', 'Connector 1')],
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      expect(
        screen.queryByTestId('streamsAppGenerateSuggestionButtonMoreButton')
      ).not.toBeInTheDocument();
    });

    it('renders the more button when there are 2 or more connectors', () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [
            createMockConnector('connector-1', 'Connector 1'),
            createMockConnector('connector-2', 'Connector 2'),
          ],
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      expect(
        screen.getByTestId('streamsAppGenerateSuggestionButtonMoreButton')
      ).toBeInTheDocument();
    });

    it('opens popover and displays connectors when more button is clicked', async () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [
            createMockConnector('connector-1', 'Connector 1'),
            createMockConnector('connector-2', 'Connector 2'),
          ],
          selectedConnector: 'connector-1',
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      fireEvent.click(screen.getByTestId('streamsAppGenerateSuggestionButtonMoreButton'));

      await waitFor(() => {
        expect(screen.getByText('Connector 1')).toBeInTheDocument();
        expect(screen.getByText('Connector 2')).toBeInTheDocument();
      });
    });

    it('calls selectConnector when a connector is selected from the popover', async () => {
      const selectConnector = jest.fn();
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [
            createMockConnector('connector-1', 'Connector 1'),
            createMockConnector('connector-2', 'Connector 2'),
          ],
          selectedConnector: 'connector-1',
          selectConnector,
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} />);

      fireEvent.click(screen.getByTestId('streamsAppGenerateSuggestionButtonMoreButton'));

      await waitFor(() => {
        expect(screen.getByText('Connector 2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connector 2'));

      expect(selectConnector).toHaveBeenCalledWith('connector-2');
    });

    it('disables the more button when isDisabled prop is true', () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [
            createMockConnector('connector-1', 'Connector 1'),
            createMockConnector('connector-2', 'Connector 2'),
          ],
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} isDisabled />);

      expect(screen.getByTestId('streamsAppGenerateSuggestionButtonMoreButton')).toBeDisabled();
    });

    it('disables the more button when isLoading prop is true', () => {
      const aiFeatures = createMockAIFeatures({
        genAiConnectors: createMockGenAiConnectors({
          connectors: [
            createMockConnector('connector-1', 'Connector 1'),
            createMockConnector('connector-2', 'Connector 2'),
          ],
        }),
      });

      render(<GenerateSuggestionButton {...defaultProps} aiFeatures={aiFeatures} isLoading />);

      expect(screen.getByTestId('streamsAppGenerateSuggestionButtonMoreButton')).toBeDisabled();
    });
  });
});

describe('AdditionalChargesCallout', () => {
  const renderWithIntl = (component: React.ReactElement) => {
    return render(<IntlProvider>{component}</IntlProvider>);
  };

  it('renders the callout with dismiss functionality', () => {
    const acknowledgeAdditionalCharges = jest.fn();
    const aiFeatures = createMockAIFeatures({
      acknowledgeAdditionalCharges,
    });

    renderWithIntl(<AdditionalChargesCallout aiFeatures={aiFeatures} />);

    // The callout should be present
    expect(screen.getByText(/Elastic Managed LLM is the new default/i)).toBeInTheDocument();

    // Click the dismiss button
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(acknowledgeAdditionalCharges).toHaveBeenCalledWith(true);
  });

  it('renders links to documentation', () => {
    const aiFeatures = createMockAIFeatures();

    renderWithIntl(<AdditionalChargesCallout aiFeatures={aiFeatures} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/cost');
    expect(links[1]).toHaveAttribute('href', 'https://example.com/learn-more');
  });
});
