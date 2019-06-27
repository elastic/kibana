/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';

import { css } from '../../../../../../common/eui_styled_components';
import {
  isConstantSegment,
  isFieldSegment,
  LogEntryMessageSegment,
} from '../../../utils/log_entry';
import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';

interface LogEntryMessageColumnProps {
  segments: LogEntryMessageSegment[];
  isHovered: boolean;
  isWrapped: boolean;
  isHighlighted: boolean;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ isHighlighted, isHovered, isWrapped, segments }) => {
    const message = useMemo(() => segments.map(formatMessageSegment).join(''), [segments]);

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

const formatMessageSegment = (messageSegment: LogEntryMessageSegment): string => {
  if (isFieldSegment(messageSegment)) {
    return messageSegment.value;
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};
