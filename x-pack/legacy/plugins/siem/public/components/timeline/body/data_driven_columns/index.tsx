/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

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

export class DataDrivenColumns extends React.PureComponent<Props> {
  public render() {
    const { _id, columnHeaders, columnRenderers, data, timelineId } = this.props;

    return (
      <EventsTdGroupData data-test-subj="data-driven-columns">
        {columnHeaders.map((header, index) => (
          <EventsTd colWidth={`${header.width}px`} key={header.id}>
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
}

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
