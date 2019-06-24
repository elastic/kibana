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
  border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  height: 100%;
  overflow: hidden;
  padding: 5px;
  user-select: none;
  width: ${({ width }) => width};
`;

const CellContainer = styled(EuiFlexGroup)<{ width: string }>`
  display: flex;
  height: 100%;
  overflow: hidden;
  width: ${({ width }) => width};
`;

export class DataDrivenColumns extends React.PureComponent<Props> {
  public render() {
    const { columnHeaders } = this.props;

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
                render={this.renderCell(header, index)}
                onResize={this.onResize}
              />
            </CellContainer>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  private renderCell = (header: ColumnHeader, index: number) => () => {
    const { columnRenderers, data, _id } = this.props;

    return (
      <EuiFlexItem grow={false}>
        <Cell
          data-test-subj="column-cell"
          index={index}
          width={`${header.width - CELL_RESIZE_HANDLE_WIDTH}px`}
        >
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
        </Cell>
      </EuiFlexItem>
    );
  };

  private onResize: OnResize = ({ delta, id }) => {
    this.props.onColumnResized({ columnId: id, delta });
  };
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
