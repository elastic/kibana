/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo } from 'react';

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
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({ browserFields, columnHeaders, data, eventId, onUpdateColumns, timelineId, toggleColumn }) => {
    const fieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
    const items = useMemo(
      () =>
        sortBy(data, ['field']).map(item => ({
          ...item,
          ...fieldsByName[item.field],
          valuesConcatenated: item.values != null ? item.values.join() : '',
        })),
      [data, fieldsByName]
    );
    const columns = useMemo(
      () =>
        getColumns({
          browserFields,
          columnHeaders,
          eventId,
          onUpdateColumns,
          contextId: timelineId,
          toggleColumn,
        }),
      [browserFields, columnHeaders, eventId, onUpdateColumns, timelineId, toggleColumn]
    );

    return (
      <div className="euiTable--compressed">
        <EuiInMemoryTable
          // @ts-ignore items going in match Partial<BrowserField>, column `render` callbacks expect complete BrowserField
          columns={columns}
          items={items}
          pagination={false}
          search={search}
          sorting={true}
        />
      </div>
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
