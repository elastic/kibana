/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { debounce } from 'lodash';
import euiStyled, { css } from '../../../../../../common/eui_styled_components';
import {
  isConstantSegment,
  isFieldSegment,
  isHighlightMessageColumn,
  isMessageColumn,
  LogEntry,
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

const getMaxLineLength = ({
  messageColumnWidth,
  characterDimensions,
}: {
  messageColumnWidth: number;
  characterDimensions: { height: number; width: number };
}) => Math.floor(messageColumnWidth / characterDimensions.width);

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, isHighlighted, isHovered, isWrapped }) => {
    const context = useLogEntryMessageColumnWidthContext();
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(
              columnValue.message,
              highlights,
              isActiveHighlight,
              isWrapped ? getMaxLineLength(context) : 0
            )
          : null,
      [columnValue, highlights, isActiveHighlight]
    );

    return (
      <MessageColumnContent
        isHighlighted={isHighlighted}
        isHovered={isHovered}
        className="messageLogColumnContent"
      >
        {message}
      </MessageColumnContent>
    );
  }
);

const useLogEntryMessageColumnWidth = ({
  characterDimensions,
  messageColumnId,
}: {
  characterDimensions: { height: number; width: number };
  messageColumnId: string;
}) => {
  const [messageColumnWidth, setMessageColumnWidth] = useState(0);
  const recalculateColumnSize = useCallback(() => {
    requestAnimationFrame(() => {
      const firstMessageColumn = document.querySelector('.messageLogColumnContent');
      if (firstMessageColumn) {
        const style = getComputedStyle(firstMessageColumn);
        const paddingWidth =
          parseFloat(style.getPropertyValue('padding-left')) +
          parseFloat(style.getPropertyValue('padding-right'));
        const width = parseFloat(style.getPropertyValue('width'));
        // This ternary ensures that the column widths are rendered and re-calculated successfully after their
        // first initial render, when the value of `width` will first be zero and then compute its actual width
        // after an animation frame. Without doing it this way — for example, first calling setMessageColumnWidth(0)
        // or setMessageColumnWidth({some value that's < paddingWidth}), it doesn't recalculate the column width after
        // the initial render. Why? Who knows.
        setMessageColumnWidth(width > paddingWidth ? width - paddingWidth : width);
      }
    });
  }, [setMessageColumnWidth]);
  useEffect(recalculateColumnSize, []);
  useEffect(() => {
    const onResize = debounce(recalculateColumnSize, 100);
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  const getLogEntryHeightFromMessageContent = useCallback(
    (
      logEntry: LogEntry,
      messageColumnWidth: number,
      characterDimensions: { height: number; width: number }
    ) => {
      const columnValue = logEntry.columns.find(column => column.columnId === messageColumnId);
      if (!isMessageColumn(columnValue))
        throw new Error('Can only get line height from a message column value');
      if (characterDimensions.width === 0) return 0; // Guard against divide by zero
      const maxLineLength = getMaxLineLength({ messageColumnWidth, characterDimensions });
      if (maxLineLength === 0) return 0;
      const messageText = columnValue.message
        .map(messageSegment =>
          isConstantSegment(messageSegment) ? messageSegment.constant : messageSegment.value
        )
        .join('');
      const messageLineHeight = messageText
        .split('\n')
        .reduce(
          (wrappedLineCount, unwrappedLine) =>
            wrappedLineCount + Math.ceil(Math.max(1, unwrappedLine.length / maxLineLength)),
          0
        );
      return messageLineHeight * characterDimensions.height;
    },
    [messageColumnId]
  );

  return {
    messageColumnWidth,
    characterDimensions,
    recalculateColumnSize,
    getLogEntryHeightFromMessageContent,
  };
};

export const [
  LogEntryMessageColumnWidthProvider,
  useLogEntryMessageColumnWidthContext,
] = createContainer(useLogEntryMessageColumnWidth);

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
  ${unwrappedContentStyle};
`;

const formatMessageSegments = (
  messageSegments: LogEntryMessageSegment[],
  highlights: LogEntryHighlightColumn[],
  isActiveHighlight: boolean,
  maxLineLength: number
) => {
  const formattedSegments = messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map(highlight =>
        isHighlightMessageColumn(highlight) ? highlight.message[index].highlights : []
      ),
      isActiveHighlight
    )
  );
  if (maxLineLength) {
    const splitSegments = formattedSegments
      .join('')
      .match(new RegExp(`.{1,${maxLineLength}}`, 'g'));
    return (
      splitSegments?.reduce((result: Array<React.ReactNode>, segment, idx, arr) => {
        result.push(segment);
        if (idx < arr.length - 1) result.push(<br />);
        return result;
      }, []) || formattedSegments
    );
  }
  return formattedSegments;
};
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
