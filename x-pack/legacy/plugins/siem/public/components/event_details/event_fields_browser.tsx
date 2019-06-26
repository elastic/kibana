/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiInMemoryTable,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { getColumns } from './columns';
import { search } from './helpers';

interface Props {
  browserFields: BrowserFields;
  data: DetailItem[];
  eventId: string;
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = pure<Props>(
  ({ browserFields, data, eventId, isLoading, onUpdateColumns, timelineId }) => (
    <EuiInMemoryTable
      items={data.map(item => ({
        ...item,
        valuesConcatenated: item.values != null ? item.values.join() : '',
      }))}
      columns={getColumns({
        browserFields,
        eventId,
        isLoading,
        onUpdateColumns,
        timelineId,
      })}
      pagination={false}
      search={search}
      sorting={true}
    />
  )
);
