/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isFieldLogColumnConfiguration,
  isMessageLogColumnConfiguration,
} from '../../../utils/source_configuration';
import { LogEntryColumnWidth, LogEntryColumn, LogEntryColumnContent } from './log_entry_column';
import { ASSUMED_SCROLLBAR_WIDTH } from './vertical_scroll_panel';

export const LogColumnHeaders = injectI18n<{
  columnConfigurations: LogColumnConfiguration[];
  columnWidths: LogEntryColumnWidth[];
  showColumnConfiguration: () => void;
}>(({ columnConfigurations, columnWidths, intl, showColumnConfiguration }) => {
  const iconColumnWidth = useMemo(() => columnWidths[columnWidths.length - 1], [columnWidths]);

  const showColumnConfigurationLabel = intl.formatMessage({
    id: 'xpack.infra.logColumnHeaders.configureColumnsLabel',
    defaultMessage: 'Configure columns',
  });

  return (
    <LogColumnHeadersWrapper>
      {columnConfigurations.map((columnConfiguration, columnIndex) => {
        const columnWidth = columnWidths[columnIndex];
        if (isTimestampLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              columnWidth={columnWidth}
              data-test-subj="logColumnHeader timestampLogColumnHeader"
              key={columnConfiguration.timestampColumn.id}
            >
              Timestamp
            </LogColumnHeader>
          );
        } else if (isMessageLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              columnWidth={columnWidth}
              data-test-subj="logColumnHeader messageLogColumnHeader"
              key={columnConfiguration.messageColumn.id}
            >
              Message
            </LogColumnHeader>
          );
        } else if (isFieldLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              columnWidth={columnWidth}
              data-test-subj="logColumnHeader fieldLogColumnHeader"
              key={columnConfiguration.fieldColumn.id}
            >
              {columnConfiguration.fieldColumn.field}
            </LogColumnHeader>
          );
        }
      })}
      <LogColumnHeader
        columnWidth={iconColumnWidth}
        data-test-subj="logColumnHeader iconLogColumnHeader"
        key="iconColumnHeader"
      >
        <EuiButtonIcon
          aria-label={showColumnConfigurationLabel}
          color="text"
          iconType="gear"
          onClick={showColumnConfiguration}
          title={showColumnConfigurationLabel}
        />
      </LogColumnHeader>
    </LogColumnHeadersWrapper>
  );
});

const LogColumnHeader: React.FunctionComponent<{
  columnWidth: LogEntryColumnWidth;
  'data-test-subj'?: string;
}> = ({ children, columnWidth, 'data-test-subj': dataTestSubj }) => (
  <LogColumnHeaderWrapper data-test-subj={dataTestSubj} {...columnWidth}>
    <LogColumnHeaderContent>{children}</LogColumnHeaderContent>
  </LogColumnHeaderWrapper>
);

const LogColumnHeadersWrapper = euiStyled.div.attrs({
  role: 'row',
})`
  align-items: stretch;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow: hidden;
  padding-right: ${ASSUMED_SCROLLBAR_WIDTH}px;
`;

const LogColumnHeaderWrapper = LogEntryColumn.extend.attrs({
  role: 'columnheader',
})`
  align-items: center;
  border-bottom: ${props => props.theme.eui.euiBorderThick};
  display: flex;
  flex-direction: row;
  height: 32px;
  overflow: hidden;
`;

const LogColumnHeaderContent = LogEntryColumnContent.extend`
  color: ${props => props.theme.eui.euiTitleColor};
  font-size: ${props => props.theme.eui.euiFontSizeS};
  font-weight: ${props => props.theme.eui.euiFontWeightSemiBold};
  line-height: ${props => props.theme.eui.euiLineHeight};
  text-overflow: clip;
  white-space: pre;
`;
