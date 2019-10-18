/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { EventDetails, View } from './event_details';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  data: DetailItem[];
  id: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

export const StatefulEventDetails = React.memo<Props>(
  ({ browserFields, columnHeaders, data, id, onUpdateColumns, timelineId, toggleColumn }) => {
    const [view, setView] = useState<View>('table-view');

    return (
      <EventDetails
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        data={data}
        id={id}
        onUpdateColumns={onUpdateColumns}
        onViewSelected={newView => setView(newView)}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
        view={view}
      />
    );
  }
);

StatefulEventDetails.displayName = 'StatefulEventDetails';
