/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { OnResize, Resizeable } from '../../../resize_handle';
import { CELL_RESIZE_HANDLE_WIDTH, CellResizeHandle } from '../../../resize_handle/styled_handles';
import { OnColumnResized } from '../../events';
import { EventsTd, EventsTdContent, EventsTdGroupData } from '../../styles';
import { ColumnHeader } from '../column_headers/column_header';
import { FullHeightFlexItem } from '../column_headers/common/styles';
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

// const Cell = styled.div<{
//   width: string;
//   index: number;
// }>`
//   background: ${({ index, theme }) =>
//     index % 2 === 0 && theme.darkMode
//       ? theme.eui.euiFormBackgroundColor
//       : index % 2 === 0 && !theme.darkMode
//       ? theme.eui.euiColorLightestShade
//       : 'inherit'};
//   height: 20px;
//   overflow: hidden;
//   user-select: none;
//   width: ${({ width }) => width};
// `;

// Cell.displayName = 'Cell';

// const CellContainer = styled(EuiFlexGroup)<{ width: string }>`
//   display: flex;
//   height: 100%;
//   overflow: hidden;
//   width: ${({ width }) => width};
// `;

// CellContainer.displayName = 'CellContainer';

export class DataDrivenColumns extends React.PureComponent<Props> {
  public render() {
    const { _id, columnHeaders, columnRenderers, data, timelineId } = this.props;

    return (
      <EventsTdGroupData data-test-subj="data-driven-columns">
        {columnHeaders.map((header, index) => (
          <EventsTd key={header.id} width={`${header.width}px`}>
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
            </EventsTdContent>
          </EventsTd>
        ))}
      </EventsTdGroupData>
    );
  }

  // private renderCell = (header: ColumnHeader, index: number) => () => {
  //   const { columnRenderers, data, _id, timelineId } = this.props;

  //   return (
  //     <EuiFlexItem grow={false}>
  //       <Cell
  //         data-test-subj="column-cell"
  //         index={index}
  //         width={`${header.width - CELL_RESIZE_HANDLE_WIDTH}px`}
  //       >
  //         {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
  //           columnName: header.id,
  //           eventId: _id,
  //           values: getMappedNonEcsValue({
  //             data,
  //             fieldName: header.id,
  //           }),
  //           field: header,
  //           width: `${header.width - CELL_RESIZE_HANDLE_WIDTH}px`,
  //           timelineId,
  //         })}
  //       </Cell>
  //     </EuiFlexItem>
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
