/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from './column_renderer';
import { FormattedFieldValue } from './formatted_field';
import { parseValue } from './parse_value';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex(item => item.field === columnName) !== -1;

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),

  renderColumn: ({
    columnName,
    eventId,
    field,
    timelineId,
    truncate,
    values,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeader;
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
  }) =>
    values != null
      ? values.map(value => (
          <FormattedFieldValue
            key={`plain-column-renderer-formatted-field-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}`}
            contextId={`plain-column-renderer-formatted-field-value-${timelineId}`}
            eventId={eventId}
            fieldFormat={field.format || ''}
            fieldName={columnName}
            fieldType={field.type || ''}
            value={parseValue(value)}
            truncate={truncate}
          />
        ))
      : getEmptyTagValue(),
};
