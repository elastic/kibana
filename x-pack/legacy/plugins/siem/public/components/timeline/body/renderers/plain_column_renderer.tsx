/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer } from './column_renderer';
import { IP_FIELD_TYPE, MESSAGE_FIELD_NAME } from './constants';
import { FormattedFieldValue } from './formatted_field';
import { parseQueryValue } from './parse_query_value';
import { parseValue } from './parse_value';

import { ColumnHeader } from '../column_headers/column_header';
import { IS_OPERATOR, DataProvider } from '../../data_providers/data_provider';
import { Provider } from '../../data_providers/provider';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { FormattedIp } from '../../../formatted_ip';
import { TimelineNonEcsData } from '../../../../graphql/types';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex(item => item.field === columnName) !== -1;

const contextId = 'plain_column_renderer';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),

  renderColumn: ({
    columnName,
    eventId,
    field,
    truncate,
    values,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeader;
    truncate?: boolean;
    values: string[] | undefined | null;
  }) =>
    values != null
      ? values.map(value => {
          const itemDataProvider: DataProvider = {
            enabled: true,
            id: escapeDataProviderId(
              `id-timeline-column-${columnName}-for-event-${eventId}-${field.id}-${value}`
            ),
            name: `${columnName}: ${parseQueryValue(value)}`,
            queryMatch: {
              field: field.id,
              value: parseQueryValue(value),
              operator: IS_OPERATOR,
            },
            excluded: false,
            kqlQuery: '',
            and: [],
          };
          if (field.type === IP_FIELD_TYPE) {
            // since ip fields may contain multiple IP addresses, return a FormattedIp here to avoid a "draggable of draggables"
            return (
              <FormattedIp
                contextId={contextId}
                eventId={eventId}
                fieldName={field.id}
                key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${field.id}--${value}`}
                value={!isNumber(value) ? value : String(value)}
                truncate={truncate}
              />
            );
          }

          if (columnNamesNotDraggable.includes(columnName)) {
            if (truncate) {
              return (
                <FormattedFieldValue
                  contextId={contextId}
                  eventId={eventId}
                  fieldFormat={field.format || ''}
                  fieldName={columnName}
                  fieldType={field.type || ''}
                  key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${field.id}--${value}`}
                  truncate={truncate}
                  value={parseValue(value)}
                />
              );
            } else {
              return (
                <FormattedFieldValue
                  contextId={contextId}
                  data-test-subj="draggable-content"
                  eventId={eventId}
                  fieldFormat={field.format || ''}
                  fieldName={columnName}
                  fieldType={field.type || ''}
                  key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${field.id}--${value}`}
                  truncate={truncate}
                  value={parseValue(value)}
                />
              );
            }
          }
          // note: we use a raw DraggableWrapper here instead of a DefaultDraggable,
          // because we pass a width to enable text truncation, and we will show empty values
          return (
            <DraggableWrapper
              dataProvider={itemDataProvider}
              key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${field.id}--${value}`}
              render={(dataProvider, _, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider} />
                  </DragEffects>
                ) : (
                  <FormattedFieldValue
                    contextId={contextId}
                    eventId={eventId}
                    fieldFormat={field.format || ''}
                    fieldName={columnName}
                    fieldType={field.type || ''}
                    value={parseValue(value)}
                  />
                )
              }
              truncate={truncate}
            />
          );
        })
      : getEmptyTagValue(),
};
