/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import { Storage } from 'ui/storage';
import { i18n } from '@kbn/i18n';
import { DataSetup } from '../../../../../../../src/legacy/core_plugins/data/public';
import { DatasourceDimensionPanelProps } from '../../types';
import {
  IndexPatternColumn,
  IndexPatternPrivateState,
  columnToOperation,
  IndexPatternField,
} from '../indexpattern';

import { getPotentialColumns } from '../operations';
import { PopoverEditor } from './popover_editor';
import { DragContextState, ChildDragDropProvider, DragDrop } from '../../drag_drop';
import { changeColumn, deleteColumn } from '../state_helpers';
import { hasField } from '../utils';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  dragDropContext: DragContextState;
  dataPlugin: DataSetup;
  storage: Storage;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  function findColumnByField(field: IndexPatternField) {
    return filteredColumns.find(col => hasField(col) && col.sourceField === field.name);
  }

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return !!field && !!field.type && !!findColumnByField(field as IndexPatternField);
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        className="lnsConfigPanel__summary"
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = findColumnByField(field as IndexPatternField);

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          props.setState(changeColumn(props.state, props.columnId, column));
        }}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <PopoverEditor
              {...props}
              selectedColumn={selectedColumn}
              filteredColumns={filteredColumns}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={null}>
            {selectedColumn && (
              <EuiFlexItem>
                <EuiButtonIcon
                  data-test-subj="indexPattern-dimensionPopover-remove"
                  iconType="cross"
                  iconSize="s"
                  color="danger"
                  aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                    defaultMessage: 'Remove',
                  })}
                  onClick={() => {
                    props.setState(deleteColumn(props.state, props.columnId));
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </DragDrop>
    </ChildDragDropProvider>
  );
}
