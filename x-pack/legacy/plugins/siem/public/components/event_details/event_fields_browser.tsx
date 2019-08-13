/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import {
  // @ts-ignore
  EuiInMemoryTable,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { BrowserFields, getAllFieldsByName } from '../../containers/source';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { getColumns } from './columns';
import { search } from './helpers';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  data: DetailItem[];
  eventId: string;
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = pure<Props>(
  ({
    browserFields,
    columnHeaders,
    data,
    eventId,
    isLoading,
    onUpdateColumns,
    timelineId,
    toggleColumn,
  }) => {
    const fieldsByName = getAllFieldsByName(browserFields);
    return (
      <EuiInMemoryTable
        items={sortBy(data, ['field']).map(item => {
          return {
            ...item,
            ...fieldsByName[item.field],
            valuesConcatenated: item.values != null ? item.values.join() : '',
          };
        })}
        columns={getColumns({
          browserFields,
          columnHeaders,
          eventId,
          isLoading,
          onUpdateColumns,
          timelineId,
          toggleColumn,
        })}
        pagination={false}
        search={search}
        sorting={true}
      />
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
