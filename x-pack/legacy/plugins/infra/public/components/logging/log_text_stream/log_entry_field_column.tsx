/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useMemo } from 'react';

import styled, { css } from '../../../../../../common/eui_styled_components';
import {
  isFieldColumn,
  isHighlightFieldColumn,
  LogEntryColumn,
  LogEntryHighlightColumn,
} from '../../../utils/log_entry';
import { highlightFieldValue, HighlightMarker } from './highlighting';
import { LogEntryColumnContent } from './log_entry_column';

interface LogEntryFieldColumnProps {
  columnValue: LogEntryColumn;
  highlights: LogEntryHighlightColumn[];
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped: boolean;
}

export const LogEntryFieldColumn: React.FunctionComponent<LogEntryFieldColumnProps> = ({
  columnValue,
  highlights: [firstHighlight], // we only support one highlight for now
  isHighlighted,
  isHovered,
  isWrapped,
}) => {
  const value = useMemo(() => (isFieldColumn(columnValue) ? JSON.parse(columnValue.value) : null), [
    columnValue,
  ]);
  const formattedValue = Array.isArray(value) ? (
    <ul>
      {value.map((entry, i) => (
        <CommaSeparatedLi key={`LogEntryFieldColumn-${i}`}>
          {highlightFieldValue(
            entry,
            isHighlightFieldColumn(firstHighlight) ? firstHighlight.highlights : [],
            HighlightMarker
          )}
        </CommaSeparatedLi>
      ))}
    </ul>
  ) : (
    highlightFieldValue(
      value,
      isHighlightFieldColumn(firstHighlight) ? firstHighlight.highlights : [],
      HighlightMarker
    )
  );

  return (
    <FieldColumnContent isHighlighted={isHighlighted} isHovered={isHovered} isWrapped={isWrapped}>
      {formattedValue}
    </FieldColumnContent>
  );
};

const hoveredContentStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
`;

const wrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

const CommaSeparatedLi = styled.li`
  display: inline;
  &:not(:last-child) {
    margin-right: 1ex;
    &::after {
      content: ',';
    }
  }
`;

const FieldColumnContent = LogEntryColumnContent.extend.attrs<{
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped?: boolean;
}>({})`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props => (props.isWrapped ? wrappedContentStyle : unwrappedContentStyle)};
`;
