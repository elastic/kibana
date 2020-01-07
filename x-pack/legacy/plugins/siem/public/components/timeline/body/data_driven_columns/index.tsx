/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { OnColumnResized } from '../../events';
import { EventsTd, EventsTdContent, EventsTdGroupData } from '../../styles';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getColumnRenderer } from '../renderers/get_column_renderer';

interface Props {
  _id: string;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  onColumnResized: OnColumnResized;
  timelineId: string;
}

export const DataDrivenColumns = React.memo<Props>(
  ({ _id, columnHeaders, columnRenderers, data, timelineId }) => {
    // Passing the styles directly to the component because the width is
    // being calculated and is recommended by Styled Components for performance
    // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
    return (
      <EventsTdGroupData data-test-subj="data-driven-columns">
        {columnHeaders.map((header, index) => (
          <EventsTd key={header.id} style={{ flexBasis: header.width + 'px' }}>
            <EventsTdContent data-test-subj="cell-container">
              {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
                columnName: header.id,
                eventId: _id,
                field: header,
                timelineId,
                truncate: true,
                values: getMappedNonEcsValue({
                  data,
                  fieldName: header.id,
                }),
              })}
            </EventsTdContent>
          </EventsTd>
        ))}
      </EventsTdGroupData>
    );
  }
);

DataDrivenColumns.displayName = 'DataDrivenColumns';

const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find(d => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};
