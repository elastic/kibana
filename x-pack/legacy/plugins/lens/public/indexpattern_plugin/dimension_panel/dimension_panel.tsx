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
import {
  IndexPatternColumn,
  IndexPatternPrivateState,
  IndexPatternField,
  OperationType,
} from '../indexpattern';

import { getAvailableOperationsByMetadata, buildColumn } from '../operations';
import { PopoverEditor } from './popover_editor';
import { DragContextState, ChildDragDropProvider, DragDrop } from '../../drag_drop';
import { changeColumn, deleteColumn } from '../state_helpers';
import { isIndexPatternField } from '../utils';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  dragDropContext: DragContextState;
  dataPlugin: DataSetup;
  storage: Storage;
  layerId: string;
};

export interface OperationFieldSupportMatrix {
  operationByField: Partial<Record<string, OperationType[]>>;
  fieldByOperation: Partial<Record<OperationType, string[]>>;
  operationByDocument: OperationType[];
}

export const IndexPatternDimensionPanel = memo(function IndexPatternDimensionPanel(
  props: IndexPatternDimensionPanelProps
) {
  const layerId = props.layerId;
  const currentIndexPattern = props.state.indexPatterns[props.state.layers[layerId].indexPatternId];

  const operationFieldSupportMatrix = useMemo(() => {
    const filteredOperationsByMetadata = getAvailableOperationsByMetadata(
      currentIndexPattern
    ).filter(operation => props.filterOperations(operation.operationMetaData));

    const supportedOperationsByField: Partial<Record<string, OperationType[]>> = {};
    const supportedFieldsByOperation: Partial<Record<OperationType, string[]>> = {};
    const supportedOperationsByDocument: OperationType[] = [];
    filteredOperationsByMetadata.forEach(({ operations }) => {
      operations.forEach(operation => {
        if (operation.type === 'field') {
          if (supportedOperationsByField[operation.field]) {
            supportedOperationsByField[operation.field]!.push(operation.operationType);
          } else {
            supportedOperationsByField[operation.field] = [operation.operationType];
          }

          if (supportedFieldsByOperation[operation.operationType]) {
            supportedFieldsByOperation[operation.operationType]!.push(operation.field);
          } else {
            supportedFieldsByOperation[operation.operationType] = [operation.field];
          }
        } else {
          supportedOperationsByDocument.push(operation.operationType);
        }
      });
    });
    return {
      operationByField: _.mapValues(supportedOperationsByField, _.uniq),
      fieldByOperation: _.mapValues(supportedFieldsByOperation, _.uniq),
      operationByDocument: _.uniq(supportedOperationsByDocument),
    };
  }, [currentIndexPattern, props.filterOperations]);

  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationFieldSupportMatrix.operationByField[field.name]);
  }

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;

    return isIndexPatternField(dragging) && Boolean(hasOperationForField(dragging));
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        className="lnsConfigPanel__summary"
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = isIndexPatternField(field) && hasOperationForField(field);

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          props.setState(
            changeColumn({
              state: props.state,
              layerId,
              columnId: props.columnId,
              newColumn: buildColumn({
                columns: props.state.layers[props.layerId].columns,
                indexPattern: currentIndexPattern,
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
              operationFieldSupportMatrix={operationFieldSupportMatrix}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={null}>
            {selectedColumn && (
              <EuiFlexItem>
                <EuiButtonIcon
                  data-test-subj="indexPattern-dimensionPopover-remove"
                  iconType="cross"
                  iconSize="s"
                  size="s"
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
