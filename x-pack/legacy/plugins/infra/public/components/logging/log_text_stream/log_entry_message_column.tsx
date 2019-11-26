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
  isHighlightMessageColumn,
  isMessageColumn,
  LogEntryColumn,
  LogEntryHighlightColumn,
  LogEntryMessageSegment,
} from '../../../utils/log_entry';
import { ActiveHighlightMarker, highlightFieldValue, HighlightMarker } from './highlighting';
import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';

interface LogEntryMessageColumnProps {
  columnValue: LogEntryColumn;
  highlights: LogEntryHighlightColumn[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped: boolean;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, isHighlighted, isHovered, isWrapped }) => {
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(columnValue.message, highlights, isActiveHighlight)
          : null,
      [columnValue, highlights, isActiveHighlight]
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

interface MessageColumnContentProps {
  isHovered: boolean;
  isHighlighted: boolean;
  isWrapped?: boolean;
}

const MessageColumnContent = euiStyled(LogEntryColumnContent)<MessageColumnContentProps>`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props => (props.isWrapped ? wrappedContentStyle : unwrappedContentStyle)};
`;

const formatMessageSegments = (
  messageSegments: LogEntryMessageSegment[],
  highlights: LogEntryHighlightColumn[],
  isActiveHighlight: boolean
) =>
  messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map(highlight =>
        isHighlightMessageColumn(highlight) ? highlight.message[index].highlights : []
      ),
      isActiveHighlight
    )
  );

const formatMessageSegment = (
  messageSegment: LogEntryMessageSegment,
  [firstHighlight = []]: string[][], // we only support one highlight for now
  isActiveHighlight: boolean
): React.ReactNode => {
  if (isFieldSegment(messageSegment)) {
    return highlightFieldValue(
      messageSegment.value,
      firstHighlight,
      isActiveHighlight ? ActiveHighlightMarker : HighlightMarker
    );
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};
