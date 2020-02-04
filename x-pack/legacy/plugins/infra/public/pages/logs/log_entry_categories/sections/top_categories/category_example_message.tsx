/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  LogEntryColumn,
  LogEntryColumnWidths,
  LogEntryMessageColumn,
  LogEntryRowWrapper,
  LogEntryTimestampColumn,
  useColumnWidths,
} from '../../../../../components/logging/log_text_stream';
import { LogColumnConfiguration } from '../../../../../utils/source_configuration';

export const exampleMessageScale = 'medium' as const;
export const exampleTimestampFormat = 'dateTime' as const;

export const CategoryExampleMessage: React.FunctionComponent<{
  columnWidths: LogEntryColumnWidths;
  message: string;
  timestamp: number;
}> = ({ columnWidths, message, timestamp }) => {
  return (
    <LogEntryRowWrapper scale={exampleMessageScale}>
      <LogEntryColumn {...columnWidths[timestampColumnId]}>
        <LogEntryTimestampColumn
          format={exampleTimestampFormat}
          isHighlighted={false}
          isHovered={false}
          time={timestamp}
        />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[messageColumnId]}>
        <LogEntryMessageColumn
          columnValue={{
            __typename: 'InfraLogEntryMessageColumn' as const,
            columnId: 'category-examples-message-column',
            message: [
              { __typename: 'InfraLogMessageFieldSegment', field: 'message', value: message },
            ],
          }}
          highlights={[]}
          isHovered={false}
          isHighlighted={false}
          isActiveHighlight={false}
          wrapMode="none"
        />
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

export const useExampleColumnWidths = () =>
  useColumnWidths({
    columnConfigurations: exampleMessageColumnConfigurations,
    scale: exampleMessageScale,
    timeFormat: exampleTimestampFormat,
  });

const timestampColumnId = 'category-example-timestamp-column' as const;
const messageColumnId = 'category-examples-message-column' as const;

export const exampleMessageColumnConfigurations: LogColumnConfiguration[] = [
  {
    __typename: 'InfraSourceTimestampLogColumn',
    timestampColumn: { id: timestampColumnId },
  },
  {
    __typename: 'InfraSourceMessageLogColumn',
    messageColumn: { id: messageColumnId },
  },
];
