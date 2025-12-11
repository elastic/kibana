/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, useEuiFontSize, transparentize } from '@elastic/eui';

/**
 * Regex patterns for detecting mentions in text
 * - Active mention: @followed by non-whitespace (user is typing)
 * - Completed mention: @viz:id or @map:id format
 */
const ACTIVE_MENTION_PATTERN = /@[^\s@]*/g;
const COMPLETED_MENTION_PATTERN = /@(viz|map):[a-zA-Z0-9_-]+/g;

interface MentionHighlightLayerProps {
  /** The text content to analyze for mentions */
  text: string;
  /** Whether the editor is currently disabled */
  disabled?: boolean;
}

/**
 * Renders a transparent layer that shows colored highlights behind mention patterns.
 * This component should be positioned absolutely behind the contenteditable editor.
 *
 * The layer renders the same text as the editor but with:
 * - Transparent text (so it doesn't show)
 * - Colored backgrounds for @mention patterns
 *
 * This creates the visual effect of highlighted mentions without modifying
 * the plain text nature of the editor.
 */
export const MentionHighlightLayer: React.FC<MentionHighlightLayerProps> = ({
  text,
  disabled = false,
}) => {
  const { euiTheme } = useEuiTheme();

  // Parse text and create highlighted segments
  const highlightedContent = useMemo(() => {
    if (!text) return null;

    // Find all mentions (both active and completed)
    const allMatches: Array<{ start: number; end: number; type: 'active' | 'completed' }> = [];

    // Find completed mentions first (@viz:id, @map:id)
    let match: RegExpExecArray | null;
    const completedPattern = new RegExp(COMPLETED_MENTION_PATTERN.source, 'g');
    while ((match = completedPattern.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'completed',
      });
    }

    // Find active mentions (@something) - but exclude ones that are part of completed mentions
    const activePattern = new RegExp(ACTIVE_MENTION_PATTERN.source, 'g');
    while ((match = activePattern.exec(text)) !== null) {
      const isPartOfCompleted = allMatches.some(
        (m) => m.type === 'completed' && match!.index >= m.start && match!.index < m.end
      );
      if (!isPartOfCompleted) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'active',
        });
      }
    }

    // Sort by start position
    allMatches.sort((a, b) => a.start - b.start);

    // Build the highlighted content
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    allMatches.forEach((m, idx) => {
      // Add text before this match
      if (m.start > lastIndex) {
        segments.push(
          <span key={`text-${idx}`}>{text.substring(lastIndex, m.start)}</span>
        );
      }

      // Add the highlighted mention
      const mentionText = text.substring(m.start, m.end);
      segments.push(
        <mark
          key={`mention-${idx}`}
          data-mention-type={m.type}
        >
          {mentionText}
        </mark>
      );

      lastIndex = m.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return segments.length > 0 ? segments : text;
  }, [text]);

  const fontSizeStyles = useEuiFontSize('m');

  const layerStyles = css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    color: transparent;
    ${fontSizeStyles}

    /* Style for active mentions (user is typing @something) */
    mark[data-mention-type='active'] {
      color: transparent;
      background-color: ${transparentize(euiTheme.colors.primary, 0.15)};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 2px;
      margin: 0 -2px;
    }

    /* Style for completed mentions (@viz:id, @map:id) */
    mark[data-mention-type='completed'] {
      color: transparent;
      background-color: ${transparentize(euiTheme.colors.success, 0.15)};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 2px;
      margin: 0 -2px;
    }
  `;

  if (disabled || !text) {
    return null;
  }

  return (
    <div css={layerStyles} aria-hidden="true">
      {highlightedContent}
    </div>
  );
};
