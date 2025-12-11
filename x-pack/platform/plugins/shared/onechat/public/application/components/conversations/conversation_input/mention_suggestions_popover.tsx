/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EuiIcon,
  EuiBadge,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VisualizationSuggestion, VisualizationType } from '../../hooks/use_visualization_search';

/**
 * Props for the MentionSuggestionsPopover component
 */
export interface MentionSuggestionsPopoverProps {
  /** Whether the popover is visible */
  isOpen: boolean;
  /** Position for anchoring the popover */
  anchorPosition: { top: number; left: number } | null;
  /** Array of matching visualization suggestions */
  suggestions: VisualizationSuggestion[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: VisualizationSuggestion) => void;
  /** Callback when the popover should close */
  onClose: () => void;
}

/**
 * Get the icon type for a visualization type
 */
function getIconForType(type: VisualizationType): string {
  switch (type) {
    case 'lens':
      return 'lensApp';
    case 'visualization':
      return 'visualizeApp';
    case 'map':
      return 'gisApp';
    default:
      return 'visPie';
  }
}

/**
 * Get the badge color for a visualization type
 */
function getBadgeColorForType(type: VisualizationType): string {
  switch (type) {
    case 'lens':
      return 'primary';
    case 'visualization':
      return 'accent';
    case 'map':
      return 'success';
    default:
      return 'default';
  }
}

const noResultsText = i18n.translate('xpack.onechat.mentionPopover.noResults', {
  defaultMessage: 'No visualizations found. Try a different search term.',
});

const loadingText = i18n.translate('xpack.onechat.mentionPopover.loading', {
  defaultMessage: 'Searching visualizations...',
});

const headerText = i18n.translate('xpack.onechat.mentionPopover.header', {
  defaultMessage: 'Reference a visualization',
});

/**
 * Popover component for displaying @mention suggestions.
 * Shows a list of visualizations matching the user's search term,
 * with keyboard navigation support.
 */
export const MentionSuggestionsPopover: React.FC<MentionSuggestionsPopoverProps> = ({
  isOpen,
  anchorPosition,
  suggestions,
  isLoading,
  onSelect,
  onClose,
}) => {
  // eslint-disable-next-line no-console
  console.debug('[MentionSuggestionsPopover] Render:', { isOpen, anchorPosition, suggestionsCount: suggestions.length, isLoading });

  const { euiTheme } = useEuiTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-suggestion-item]');
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      switch (event.key) {
        case keys.ARROW_DOWN:
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;

        case keys.ARROW_UP:
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case keys.ENTER:
          event.preventDefault();
          event.stopPropagation();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;

        case keys.ESCAPE:
          event.preventDefault();
          onClose();
          break;

        case keys.TAB:
          // Allow tab to close and move focus
          onClose();
          break;
      }
    },
    [isOpen, suggestions, selectedIndex, onSelect, onClose]
  );

  // Attach keyboard listener to document
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isOpen, handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorPosition) {
    return null;
  }

  // Ensure popover stays within viewport bounds
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const popoverWidth = 320;
  const popoverHeight = 300;

  // Adjust position to stay within viewport
  let adjustedTop = anchorPosition.top + 4;
  // Ensure left position keeps popover fully visible
  let adjustedLeft = Math.min(anchorPosition.left, viewportWidth - popoverWidth - 20);
  adjustedLeft = Math.max(10, adjustedLeft);

  // If popover would go below viewport, show it above the cursor instead
  if (adjustedTop + popoverHeight > viewportHeight) {
    adjustedTop = anchorPosition.top - popoverHeight - 4;
  }

  // Ensure top is not negative
  adjustedTop = Math.max(10, adjustedTop);

  const popoverStyles = css`
    position: fixed;
    top: ${adjustedTop}px;
    left: ${adjustedLeft}px;
    z-index: 99999;
    width: 320px;
    max-height: 300px;
    overflow-y: auto;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: ${euiTheme.size.xs};
  `;

  const suggestionItemStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    cursor: pointer;
    transition: background-color ${euiTheme.animation.fast};

    &:hover {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const suggestionIconStyles = css`
    flex-shrink: 0;
  `;

  const suggestionTitleStyles = css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const suggestionBadgeStyles = css`
    flex-shrink: 0;
  `;

  const selectedItemStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  const loadingContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${euiTheme.size.m};
    gap: ${euiTheme.size.s};
  `;

  const noResultsStyles = css`
    padding: ${euiTheme.size.m};
    text-align: center;
    color: ${euiTheme.colors.textSubdued};
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.xs};
    border-bottom: ${euiTheme.border.thin};
    margin-bottom: ${euiTheme.size.xs};
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
  `;

  // Use portal to render at document.body level to escape flyout stacking context
  const popoverContent = (
    <div ref={popoverRef} css={popoverStyles} data-test-subj="mentionSuggestionsPopover">
      <div css={headerStyles}>
        <EuiIcon type="visBarVertical" size="s" color="primary" />
        <EuiText size="xs" color="subdued">
          <strong>{headerText}</strong>
        </EuiText>
      </div>
      {isLoading ? (
        <div css={loadingContainerStyles}>
          <EuiLoadingSpinner size="s" />
          <EuiText size="s" color="subdued">
            {loadingText}
          </EuiText>
        </div>
      ) : suggestions.length === 0 ? (
        <div css={noResultsStyles}>
          <EuiText size="s">{noResultsText}</EuiText>
        </div>
      ) : (
        <div ref={listRef} role="listbox" aria-label="Visualization suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              css={[suggestionItemStyles, index === selectedIndex && selectedItemStyles]}
              role="option"
              aria-selected={index === selectedIndex}
              data-suggestion-item
              data-test-subj={`mentionSuggestion-${suggestion.id}`}
              onMouseDown={(e) => {
                // Prevent the click from stealing focus from the editor
                e.preventDefault();
                onSelect(suggestion);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <EuiIcon type={getIconForType(suggestion.type)} size="m" css={suggestionIconStyles} />
              <span css={suggestionTitleStyles}>{suggestion.title}</span>
              <EuiBadge color={getBadgeColorForType(suggestion.type)} css={suggestionBadgeStyles}>
                {suggestion.type}
              </EuiBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render via portal to escape flyout's stacking context
  return createPortal(popoverContent, document.body);
};
