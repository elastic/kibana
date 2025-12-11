/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { MentionSuggestionsPopover } from './mention_suggestions_popover';
import type { VisualizationSuggestion } from '../../hooks/use_visualization_search';

const mockSuggestions: VisualizationSuggestion[] = [
  { id: 'lens-1', title: 'Sales Dashboard', type: 'lens' },
  { id: 'viz-1', title: 'Revenue Chart', type: 'visualization' },
  { id: 'map-1', title: 'Store Locations', type: 'map' },
];

const defaultProps = {
  isOpen: true,
  anchorPosition: { top: 100, left: 200 },
  suggestions: mockSuggestions,
  isLoading: false,
  onSelect: jest.fn(),
  onClose: jest.fn(),
};

const renderWithEui = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('MentionSuggestionsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('mentionSuggestionsPopover')).not.toBeInTheDocument();
  });

  it('renders nothing when anchorPosition is null', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} anchorPosition={null} />);

    expect(screen.queryByTestId('mentionSuggestionsPopover')).not.toBeInTheDocument();
  });

  it('renders the popover with suggestions', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

    expect(screen.getByTestId('mentionSuggestionsPopover')).toBeInTheDocument();
    expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Revenue Chart')).toBeInTheDocument();
    expect(screen.getByText('Store Locations')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} isLoading suggestions={[]} />);

    expect(screen.getByText('Searching visualizations...')).toBeInTheDocument();
  });

  it('renders no results message when suggestions are empty', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} suggestions={[]} />);

    expect(screen.getByText('No visualizations found')).toBeInTheDocument();
  });

  it('calls onSelect when a suggestion is clicked', () => {
    const onSelect = jest.fn();
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Sales Dashboard'));

    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('highlights suggestion on mouse enter', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

    const secondItem = screen.getByTestId('mentionSuggestion-viz-1');
    fireEvent.mouseEnter(secondItem);

    // The item should now be aria-selected
    expect(secondItem).toHaveAttribute('aria-selected', 'true');
  });

  it('displays correct icons for each visualization type', () => {
    renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

    // All suggestions should be rendered with their type badges
    expect(screen.getByText('lens')).toBeInTheDocument();
    expect(screen.getByText('visualization')).toBeInTheDocument();
    expect(screen.getByText('map')).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('selects next item on ArrowDown', () => {
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

      // First item should be selected initially
      expect(screen.getByTestId('mentionSuggestion-lens-1')).toHaveAttribute(
        'aria-selected',
        'true'
      );

      // Press ArrowDown
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Second item should now be selected
      expect(screen.getByTestId('mentionSuggestion-viz-1')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('selects previous item on ArrowUp', () => {
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

      // Move to second item
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Press ArrowUp
      fireEvent.keyDown(document, { key: 'ArrowUp' });

      // First item should be selected again
      expect(screen.getByTestId('mentionSuggestion-lens-1')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('does not go below first item on ArrowUp', () => {
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

      // Press ArrowUp when at first item
      fireEvent.keyDown(document, { key: 'ArrowUp' });

      // First item should still be selected
      expect(screen.getByTestId('mentionSuggestion-lens-1')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('does not go above last item on ArrowDown', () => {
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} />);

      // Move to last item
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' }); // Extra to confirm

      // Last item should be selected
      expect(screen.getByTestId('mentionSuggestion-map-1')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('selects current item on Enter', () => {
      const onSelect = jest.fn();
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} onSelect={onSelect} />);

      // Press Enter to select first item
      fireEvent.keyDown(document, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('closes popover on Escape', () => {
      const onClose = jest.fn();
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('closes popover on Tab', () => {
      const onClose = jest.fn();
      renderWithEui(<MentionSuggestionsPopover {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Tab' });

      expect(onClose).toHaveBeenCalled();
    });
  });
});
