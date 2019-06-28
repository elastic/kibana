/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { darken, transparentize } from 'polished';
import React, { useState, useCallback, useMemo } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import {
  LogEntry,
  isFieldColumn,
  isMessageColumn,
  isTimestampColumn,
} from '../../../utils/log_entry';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isMessageLogColumnConfiguration,
  isFieldLogColumnConfiguration,
} from '../../../utils/source_configuration';
import { TextScale } from '../../../../common/log_text_scale';
import { LogEntryColumn, LogEntryColumnWidth } from './log_entry_column';
import { LogEntryFieldColumn } from './log_entry_field_column';
import { LogEntryDetailsIconColumn } from './log_entry_icon_column';
import { LogEntryMessageColumn } from './log_entry_message_column';
import { LogEntryTimestampColumn } from './log_entry_timestamp_column';
import { monospaceTextStyle } from './text_styles';

interface LogEntryRowProps {
  boundingBoxRef?: React.Ref<Element>;
  columnConfigurations: LogColumnConfiguration[];
  columnWidths: LogEntryColumnWidth[];
  isHighlighted: boolean;
  logEntry: LogEntry;
  openFlyoutWithItem: (id: string) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogEntryRow = ({
  boundingBoxRef,
  columnConfigurations,
  columnWidths,
  isHighlighted,
  logEntry,
  openFlyoutWithItem,
  scale,
  wrap,
}: LogEntryRowProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const setItemIsHovered = useCallback(() => {
    setIsHovered(true);
  }, []);

  const setItemIsNotHovered = useCallback(() => {
    setIsHovered(false);
  }, []);

  const openFlyout = useCallback(() => openFlyoutWithItem(logEntry.gid), [
    openFlyoutWithItem,
    logEntry.gid,
  ]);

  const iconColumnWidth = useMemo(() => columnWidths[columnWidths.length - 1], [columnWidths]);

  return (
    <LogEntryRowWrapper
      data-test-subj="streamEntry logTextStreamEntry"
      innerRef={
        /* Workaround for missing RefObject support in styled-components */
        boundingBoxRef as any
      }
      onMouseEnter={setItemIsHovered}
      onMouseLeave={setItemIsNotHovered}
      scale={scale}
    >
      {logEntry.columns.map((column, columnIndex) => {
        const columnConfiguration = columnConfigurations[columnIndex];
        const columnWidth = columnWidths[columnIndex];

        if (isTimestampColumn(column) && isTimestampLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogEntryColumn
              data-test-subj="logColumn timestampLogColumn"
              key={columnConfiguration.timestampColumn.id}
              {...columnWidth}
            >
              <LogEntryTimestampColumn
                isHighlighted={isHighlighted}
                isHovered={isHovered}
                time={column.timestamp}
              />
            </LogEntryColumn>
          );
        } else if (
          isMessageColumn(column) &&
          isMessageLogColumnConfiguration(columnConfiguration)
        ) {
          return (
            <LogEntryColumn
              data-test-subj="logColumn messageLogColumn"
              key={columnConfiguration.messageColumn.id}
              {...columnWidth}
            >
              <LogEntryMessageColumn
                isHighlighted={isHighlighted}
                isHovered={isHovered}
                isWrapped={wrap}
                segments={column.message}
              />
            </LogEntryColumn>
          );
        } else if (isFieldColumn(column) && isFieldLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogEntryColumn
              data-test-subj={`logColumn fieldLogColumn fieldLogColumn:${column.field}`}
              key={columnConfiguration.fieldColumn.id}
              {...columnWidth}
            >
              <LogEntryFieldColumn
                isHighlighted={isHighlighted}
                isHovered={isHovered}
                isWrapped={wrap}
                encodedValue={column.value}
              />
            </LogEntryColumn>
          );
        }
      })}
      <LogEntryColumn key="logColumn iconLogColumn iconLogColumn:details" {...iconColumnWidth}>
        <LogEntryDetailsIconColumn
          isHighlighted={isHighlighted}
          isHovered={isHovered}
          openFlyout={openFlyout}
        />
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

const LogEntryRowWrapper = euiStyled.div.attrs<{
  scale: TextScale;
}>({
  role: 'row',
})`
  align-items: stretch;
  color: ${props => props.theme.eui.euiTextColor};
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow: hidden;

  ${props => monospaceTextStyle(props.scale)}
`;
