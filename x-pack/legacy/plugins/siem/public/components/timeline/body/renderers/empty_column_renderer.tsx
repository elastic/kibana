/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from './column_renderer';
import { DraggableWrapper, DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { parseQueryValue } from './parse_query_value';
import { EXISTS_OPERATOR } from '../../data_providers/data_provider';
import { Provider } from '../../data_providers/provider';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { getEmptyValue } from '../../../empty_value';

export const dataNotExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex(item => item.field === columnName) === -1;

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataNotExistsAtColumn(columnName, data),
  renderColumn: ({
    columnName,
    eventId,
    field,
    width,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeader;
    width?: string;
  }) => (
    <DraggableWrapper
      key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${field.id}`}
      dataProvider={{
        enabled: true,
        id: escapeDataProviderId(
          `id-timeline-column-${columnName}-for-event-${eventId}-${field.id}`
        ),
        name: `${columnName}: ${parseQueryValue(null)}`,
        queryMatch: {
          field: field.id,
          value: parseQueryValue(null),
          displayValue: getEmptyValue(),
          operator: EXISTS_OPERATOR,
        },
        excluded: true,
        kqlQuery: '',
        and: [],
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <span>{getEmptyValue()}</span>
        )
      }
      width={width}
    />
  ),
};
