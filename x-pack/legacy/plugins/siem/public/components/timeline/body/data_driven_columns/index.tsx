/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { ColumnHeader } from '../column_headers/column_header';
import { FullHeightFlexItem } from '../column_headers/common/styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getColumnRenderer } from '../renderers/get_column_renderer';
import { OnColumnResized } from '../../events';
import { TimelineCell, TimelineCellContent, TimelineRowGroupData } from '../../styles';
import { OnResize, Resizeable } from '../../../resize_handle';
import { CELL_RESIZE_HANDLE_WIDTH, CellResizeHandle } from '../../../resize_handle/styled_handles';
import { TimelineNonEcsData } from '../../../../graphql/types';

interface Props {
  _id: string;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  onColumnResized: OnColumnResized;
}

export class DataDrivenColumns extends React.PureComponent<Props> {
  public render() {
    const { columnHeaders, columnRenderers, data, _id } = this.props;

    return (
      <TimelineRowGroupData data-test-subj="data-driven-columns">
        {columnHeaders.map((header, index) => (
          <TimelineCell key={header.id} width={`${header.width}px`}>
            <TimelineCellContent data-test-subj="cell-container" key={header.id}>
              {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
                columnName: header.id,
                eventId: _id,
                values: getMappedNonEcsValue({
                  data,
                  fieldName: header.id,
                }),
                field: header,
                width: `${header.width - CELL_RESIZE_HANDLE_WIDTH}px`,
              })}

              {/* <Resizeable
                handle={
                  <FullHeightFlexItem grow={false}>
                    <CellResizeHandle data-test-subj="cell-resize-handle" />
                  </FullHeightFlexItem>
                }
                height="100%"
                id={header.id}
                key={header.id}
                render={this.renderCell(header, index)}
                onResize={this.onResize}
              /> */}
            </TimelineCellContent>
          </TimelineCell>
        ))}
      </TimelineRowGroupData>
    );
  }

  // private renderCell = (header: ColumnHeader, index: number) => () => {
  //   const { columnRenderers, data, _id } = this.props;

  //   return (
  //     <div
  //       data-test-subj="column-cell"
  //       index={index}
  //       width={`${header.width - CELL_RESIZE_HANDLE_WIDTH}px`}
  //     >
  //       {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
  //         columnName: header.id,
  //         eventId: _id,
  //         values: getMappedNonEcsValue({
  //           data,
  //           fieldName: header.id,
  //         }),
  //         field: header,
  //         width: `${header.width - CELL_RESIZE_HANDLE_WIDTH}px`,
  //       })}
  //     </div>
  //   );
  // };

  // private onResize: OnResize = ({ delta, id }) => {
  //   this.props.onColumnResized({ columnId: id, delta });
  // };
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
