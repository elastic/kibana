/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC, PropsWithChildren } from 'react';

import styled from '@emotion/styled';

import { useEuiFontSize } from '@elastic/eui';
import {
  LogEntryColumn,
  LogEntryColumnContent,
  LogEntryColumnWidth,
  LogEntryColumnWidths,
} from './log_entry_column';
import { useLogPositionStateContext } from '../../../containers/logs/log_position';
import { localizedDate } from '../../../../common/formatters/datetime';
import {
  LogColumnRenderConfiguration,
  isTimestampColumnRenderConfiguration,
  isMessageColumnRenderConfiguration,
  isFieldColumnRenderConfiguration,
} from '../../../utils/log_column_render_configuration';
import LogColumnHeadersWrapper from './column_headers_wrapper';

export const LogColumnHeaders: React.FunctionComponent<{
  columnConfigurations: LogColumnRenderConfiguration[];
  columnWidths: LogEntryColumnWidths;
}> = ({ columnConfigurations, columnWidths }) => {
  const { firstVisiblePosition } = useLogPositionStateContext();
  return (
    <LogColumnHeadersWrapper>
      {columnConfigurations.map((columnConfiguration) => {
        if (isTimestampColumnRenderConfiguration(columnConfiguration)) {
          let columnHeader;
          if (columnConfiguration.timestampColumn.header === false) {
            columnHeader = null;
          } else if (typeof columnConfiguration.timestampColumn.header === 'string') {
            columnHeader = columnConfiguration.timestampColumn.header;
          } else {
            columnHeader = firstVisiblePosition
              ? localizedDate(new Date(firstVisiblePosition.time))
              : i18n.translate('xpack.logsShared.logs.stream.timestampColumnTitle', {
                  defaultMessage: 'Timestamp',
                });
          }

          return (
            <LogColumnHeader
              key={columnConfiguration.timestampColumn.id}
              columnWidth={columnWidths[columnConfiguration.timestampColumn.id]}
              data-test-subj="logColumnHeader timestampLogColumnHeader"
            >
              {columnHeader}
            </LogColumnHeader>
          );
        } else if (isMessageColumnRenderConfiguration(columnConfiguration)) {
          let columnHeader;
          if (columnConfiguration.messageColumn.header === false) {
            columnHeader = null;
          } else if (typeof columnConfiguration.messageColumn.header === 'string') {
            columnHeader = columnConfiguration.messageColumn.header;
          } else {
            columnHeader = i18n.translate('xpack.logsShared.logs.stream.messageColumnTitle', {
              defaultMessage: 'Message',
            });
          }

          return (
            <LogColumnHeader
              columnWidth={columnWidths[columnConfiguration.messageColumn.id]}
              data-test-subj="logColumnHeader messageLogColumnHeader"
              key={columnConfiguration.messageColumn.id}
            >
              {columnHeader}
            </LogColumnHeader>
          );
        } else if (isFieldColumnRenderConfiguration(columnConfiguration)) {
          let columnHeader;
          if (columnConfiguration.fieldColumn.header === false) {
            columnHeader = null;
          } else if (typeof columnConfiguration.fieldColumn.header === 'string') {
            columnHeader = columnConfiguration.fieldColumn.header;
          } else {
            columnHeader = columnConfiguration.fieldColumn.field;
          }

          return (
            <LogColumnHeader
              columnWidth={columnWidths[columnConfiguration.fieldColumn.id]}
              data-test-subj="logColumnHeader fieldLogColumnHeader"
              key={columnConfiguration.fieldColumn.id}
            >
              {columnHeader}
            </LogColumnHeader>
          );
        }
      })}
    </LogColumnHeadersWrapper>
  );
};

export const LogColumnHeader: FC<
  PropsWithChildren<{
    columnWidth: LogEntryColumnWidth;
    'data-test-subj'?: string;
  }>
> = ({ children, columnWidth, 'data-test-subj': dataTestSubj }) => (
  <LogColumnHeaderWrapper data-test-subj={dataTestSubj} {...columnWidth} role="columnheader">
    <LogColumnHeaderContent>{children}</LogColumnHeaderContent>
  </LogColumnHeaderWrapper>
);

const LogColumnHeaderWrapper = styled(LogEntryColumn)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 32px;
  overflow: hidden;
`;

const LogColumnHeaderContent = styled(LogEntryColumnContent)`
  color: ${(props) => props.theme.euiTheme.colors.textParagraph};
  font-size: ${() => useEuiFontSize('s').fontSize};
  font-weight: ${(props) => props.theme.euiTheme.font.weight.semiBold};
  line-height: ${() => useEuiFontSize('s').lineHeight};
  text-overflow: clip;
  white-space: pre;
`;

// eslint-disable-next-line import/no-default-export
export default LogColumnHeader;
