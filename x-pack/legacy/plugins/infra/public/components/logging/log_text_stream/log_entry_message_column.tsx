/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';

import euiStyled, { css } from '../../../../../../common/eui_styled_components';
import {
  isConstantSegment,
  isFieldSegment,
  LogEntryMessageSegment,
  LogEntryColumn,
  LogEntryHighlightColumn,
  isMessageColumn,
  isHighlightMessageColumn,
} from '../../../utils/log_entry';
import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';

interface LogEntryMessageColumnProps {
  columnValue: LogEntryColumn;
  highlights: LogEntryHighlightColumn[];
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped: boolean;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isHighlighted, isHovered, isWrapped }) => {
    const message = useMemo(
      () => (isMessageColumn(columnValue) ? formatMessage(columnValue.message, highlights) : null),
      [columnValue, highlights]
    );

    return (
      <MessageColumnContent
        isHighlighted={isHighlighted}
        isHovered={isHovered}
        isWrapped={isWrapped}
      >
        {message}
      </MessageColumnContent>
    );
  }
);

const wrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

const HighlightMarker = euiStyled.span`
  color: ${props =>
    props.theme.darkMode ? props.theme.eui.euiTextColor : props.theme.eui.euiColorGhost}
  background-color: ${props => props.theme.eui.euiColorSecondary}
`;

const MessageColumnContent = LogEntryColumnContent.extend.attrs<{
  isHovered: boolean;
  isHighlighted: boolean;
  isWrapped?: boolean;
}>({})`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props => (props.isWrapped ? wrappedContentStyle : unwrappedContentStyle)};
`;

const formatMessage = (
  messageSegments: LogEntryMessageSegment[],
  highlights: LogEntryHighlightColumn[]
) =>
  messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map(highlight =>
        isHighlightMessageColumn(highlight) ? highlight.message[index].highlights : []
      )
    )
  );

const formatMessageSegment = (
  messageSegment: LogEntryMessageSegment,
  [firstHighlight = []]: string[][]
): React.ReactNode => {
  if (isFieldSegment(messageSegment)) {
    return highlightFieldValue(messageSegment.value, firstHighlight, HighlightMarker);
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};

const highlightFieldValue = (
  value: string,
  highlightTerms: string[],
  HighlightComponent: React.ComponentType
) =>
  highlightTerms.reduce<React.ReactNode[]>(
    (fragments, highlightTerm, index) => {
      const lastFragment = fragments[fragments.length - 1];

      if (typeof lastFragment !== 'string') {
        return fragments;
      }

      const highlightTermPosition = lastFragment.indexOf(highlightTerm);

      if (highlightTermPosition > -1) {
        return [
          ...fragments.slice(0, fragments.length - 1),
          lastFragment.slice(0, highlightTermPosition),
          <HighlightComponent key={`highlight-${highlightTerm}-${index}`}>
            {highlightTerm}
          </HighlightComponent>,
          lastFragment.slice(highlightTermPosition + highlightTerm.length),
        ];
      } else {
        return fragments;
      }
    },
    [value]
  );
