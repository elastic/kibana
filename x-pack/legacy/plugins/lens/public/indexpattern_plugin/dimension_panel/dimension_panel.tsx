/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { memo, useMemo } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import { Storage } from 'ui/storage';
import { i18n } from '@kbn/i18n';
import { DataSetup } from '../../../../../../../src/legacy/core_plugins/data/public';
import { DatasourceDimensionPanelProps } from '../../types';
import { IndexPatternColumn, IndexPatternPrivateState, IndexPatternField } from '../indexpattern';

import { getPotentialOperations, buildColumnForField } from '../operations';
import { PopoverEditor } from './popover_editor';
import { DragContextState, ChildDragDropProvider, DragDrop } from '../../drag_drop';
import { changeColumn, deleteColumn } from '../state_helpers';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  dragDropContext: DragContextState;
  dataPlugin: DataSetup;
  storage: Storage;
  layerId: string;
};

export const IndexPatternDimensionPanel = memo(function IndexPatternDimensionPanel(
  props: IndexPatternDimensionPanelProps
) {
  const layerId = props.layerId;
  const indexPatternId = props.state.layers[layerId].indexPatternId;
  const currentIndexPattern = props.state.indexPatterns[indexPatternId];

  const operations = useMemo(() => {
    return getPotentialOperations(props.state.indexPatterns[indexPatternId]);
  }, [props.state.indexPatterns[indexPatternId]]);

  const filteredOperations = useMemo(
    () =>
      operations.filter(operation => {
        return props.filterOperations(operation.operationMeta);
      }),
    [operations, props.filterOperations]
  );

  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(
      filteredOperations.find(operation => operation.applicableFields.includes(field.name))
    );
  }

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return !!field && !!field.type && !!hasOperationForField(field as IndexPatternField);
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        className="lnsConfigPanel__summary"
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const operation = hasOperationForField(field as IndexPatternField);
          if (!operation) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          props.setState(
            changeColumn({
              state: props.state,
              layerId,
              columnId: props.columnId,
              newColumn: buildColumnForField({
                // TODO think about this
                index: 0,
                columns: props.state.layers[props.layerId].columns,
                indexPatternId,
                layerId,
                suggestedPriority: props.suggestedPriority,
                field: field as IndexPatternField,
              }),
            })
          );
        }}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <PopoverEditor
              {...props}
              currentIndexPattern={currentIndexPattern}
              selectedColumn={selectedColumn}
              filteredOperations={filteredOperations}
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
                    props.setState(
                      deleteColumn({
                        state: props.state,
                        layerId,
                        columnId: props.columnId,
                      })
                    );
                    if (props.onRemove) {
                      props.onRemove(props.columnId);
                    }
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </DragDrop>
    </ChildDragDropProvider>
  );
});
