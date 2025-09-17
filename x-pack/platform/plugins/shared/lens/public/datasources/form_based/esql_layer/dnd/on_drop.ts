/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextBasedLayerColumn, TextBasedPrivateState } from '../types';
import { reorderElements } from '../../../../utils';
import type { DatasourceDimensionDropHandlerProps } from '../../../../types';
import { isOperation } from '../../../../types';
import { removeColumn } from '../remove_column';

export const onDrop = (props: DatasourceDimensionDropHandlerProps<TextBasedPrivateState>) => {
  const { dropType, state, source, target } = props;
  if (
    ![
      'field_add',
      'field_replace',
      'duplicate_compatible',
      'replace_duplicate_compatible',
      'replace_compatible',
      'move_compatible',
      'swap_compatible',
      'reorder',
    ].includes(dropType)
  ) {
    return undefined;
  }

  const layer = state.layers[target.layerId];
  if (!layer) {
    return undefined;
  }
  const sourceField = layer.columns.find(
    (f) => f.columnId === source.id || f.variable === source.id
  );
  if (!sourceField) {
    return;
  }
  const targetField = layer.columns.find((f) => f.columnId === target.columnId);

  const newSourceColumn: TextBasedLayerColumn = {
    ...sourceField,
    columnId: target.columnId,
  };

  let columns: TextBasedLayerColumn[] | undefined;

  switch (dropType) {
    case 'field_add':
    case 'duplicate_compatible':
    case 'replace_duplicate_compatible':
      columns = [...layer.columns.filter((c) => c.columnId !== target.columnId), newSourceColumn];
      break;
    case 'field_replace':
    case 'replace_compatible':
      columns = layer.columns.map((c) => (c.columnId === target.columnId ? newSourceColumn : c));
      break;
    case 'move_compatible':
      columns = [...layer.columns, newSourceColumn];
      break;
    case 'swap_compatible': {
      if (!targetField) {
        return;
      }
      const newTargetColumn: TextBasedLayerColumn = {
        ...targetField,
        columnId: sourceField.columnId,
      };
      columns = layer.columns.map((c) =>
        c.columnId === targetField.columnId
          ? newSourceColumn
          : c.columnId === sourceField.columnId
          ? newTargetColumn
          : c
      );
      break;
    }

    case 'reorder':
      const targetColumn = layer.columns.find((f) => f.columnId === target.columnId);
      const sourceColumn = layer.columns.find((f) => f.columnId === source.id);
      if (!targetColumn || !sourceColumn) return;
      columns = reorderElements(layer.columns, targetColumn, sourceColumn);
      break;
  }

  if (!columns) return;

  const newState = {
    ...props.state,
    layers: {
      ...props.state.layers,
      [target.layerId]: {
        ...layer,
        columns,
      },
    },
  };
  if (isOperation(source) && ['replace_compatible', 'move_compatible'].includes(dropType)) {
    return removeColumn({
      prevState: newState,
      columnId: source.columnId,
      layerId: source.layerId,
    });
  }
  return newState;
};
