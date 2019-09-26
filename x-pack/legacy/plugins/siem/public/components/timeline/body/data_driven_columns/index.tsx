/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { OnResize, Resizeable } from '../../../resize_handle';
import { CELL_RESIZE_HANDLE_WIDTH, CellResizeHandle } from '../../../resize_handle/styled_handles';
import { OnColumnResized } from '../../events';
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

const Cell = styled.div<{
  width: string;
  index: number;
}>`
  background: ${({ index, theme }) =>
    index % 2 === 0 && theme.darkMode
      ? theme.eui.euiFormBackgroundColor
      : index % 2 === 0 && !theme.darkMode
      ? theme.eui.euiColorLightestShade
      : 'inherit'};
  height: 20px;
  overflow: hidden;
  user-select: none;
  width: ${({ width }) => width};
`;

Cell.displayName = 'Cell';

const CellContainer = styled(EuiFlexGroup)<{ width: string }>`
  display: flex;
  height: 100%;
  overflow: hidden;
  width: ${({ width }) => width};
`;

CellContainer.displayName = 'CellContainer';

export const DataDrivenColumns = React.memo<Props>(
  ({ _id, columnHeaders, columnRenderers, data, onColumnResized, timelineId }) => {
    const renderCell = (header: ColumnHeader, index: number) => () => (
      <EuiFlexItem grow={false}>
        <Cell
          data-test-subj="column-cell"
          index={index}
          width={`${header.width - CELL_RESIZE_HANDLE_WIDTH}px`}
        >
          {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
            columnName: header.id,
            eventId: _id,
            field: header,
            timelineId,
            values: getMappedNonEcsValue({
              data,
              fieldName: header.id,
            }),
            width: `${header.width - CELL_RESIZE_HANDLE_WIDTH}px`,
          })}
        </Cell>
      </EuiFlexItem>
    );

    const onResize: OnResize = ({ delta, id }) => onColumnResized({ columnId: id, delta });

    return (
      <EuiFlexGroup data-test-subj="data-driven-columns" direction="row" gutterSize="none">
        {columnHeaders.map((header, index) => (
          <EuiFlexItem grow={false} key={header.id}>
            <CellContainer
              data-test-subj="cell-container"
              gutterSize="none"
              key={header.id}
              width={`${header.width}px`}
            >
              <Resizeable
                handle={
                  <FullHeightFlexItem grow={false}>
                    <CellResizeHandle data-test-subj="cell-resize-handle" />
                  </FullHeightFlexItem>
                }
                height="100%"
                id={header.id}
                key={header.id}
                onResize={onResize}
                render={renderCell(header, index)}
              />
            </CellContainer>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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
