/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { DocumentMatchFilterControls } from './document_match_filter_controls';
import { useStreamSamplesSelector } from './state_management/stream_routing_state_machine';

jest.mock('./state_management/stream_routing_state_machine');

const mockUseStreamSamplesSelector = useStreamSamplesSelector as jest.MockedFunction<
  typeof useStreamSamplesSelector
>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('DocumentMatchFilterControls', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamSamplesSelector.mockReturnValue('matched' as any);
  });

  it('should render nothing when isDisabled is true', () => {
    const { container } = renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={0.5}
        isDisabled={true}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when matchedDocumentPercentage is undefined', () => {
    const { container } = renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={undefined}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should enable filter controls when condition is set', () => {
    renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={0.5}
        isDisabled={false}
      />
    );

    const matchedButton = screen.getByTestId('routingPreviewMatchedFilterButton');
    const unmatchedButton = screen.getByTestId('routingPreviewUnmatchedFilterButton');

    expect(matchedButton).not.toBeDisabled();
    expect(unmatchedButton).not.toBeDisabled();
  });

  it('should show filter tooltip when controls are visible', () => {
    renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={0.5}
        isDisabled={false}
      />
    );

    expect(screen.getByTestId('routingPreviewFilterControlsTooltip')).toBeInTheDocument();
  });

  it('should call onFilterChange when filter button is clicked', async () => {
    const user = userEvent.setup();
    mockUseStreamSamplesSelector.mockReturnValue('matched' as any);

    renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={0.5}
      />
    );

    const unmatchedButton = screen.getByTestId('routingPreviewUnmatchedFilterButton');
    await user.click(unmatchedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith('unmatched');
  });

  it('should display percentage badges correctly', () => {
    renderWithProviders(
      <DocumentMatchFilterControls
        onFilterChange={mockOnFilterChange}
        matchedDocumentPercentage={0.75}
      />
    );

    const matchedButton = screen.getByTestId('routingPreviewMatchedFilterButton');
    const unmatchedButton = screen.getByTestId('routingPreviewUnmatchedFilterButton');

    expect(matchedButton).toHaveTextContent('75%');
    expect(unmatchedButton).toHaveTextContent('25%');
  });
});
