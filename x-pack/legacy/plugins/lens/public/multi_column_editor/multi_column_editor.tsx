/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourcePublicAPI, OperationMetadata } from '../types';
import { DragContextState } from '../drag_drop';
import { DimensionPanel } from '../dimension_panel';

interface Props {
  accessors: string[];
  datasource: DatasourcePublicAPI;
  dragDropContext: DragContextState;
  onRemove: (accessor: string) => void;
  onAdd: (accessor: string) => void;
  filterOperations: (op: OperationMetadata) => boolean;
  suggestedPriority?: 0 | 1 | 2 | undefined;
  testSubj: string;
  layerId: string;
}

const noop = () => {};

export function MultiColumnEditor({
  accessors,
  datasource,
  dragDropContext,
  onRemove,
  onAdd,
  filterOperations,
  suggestedPriority,
  testSubj,
  layerId,
}: Props) {
  return (
    <>
      {accessors.map(accessor => (
        <div key={accessor}>
          <DimensionPanel
            data-test-subj={`lns_multi_column_${testSubj}_${accessor}`}
            datasource={datasource}
            layerId={layerId}
            columnId={accessor}
            dragDropContext={dragDropContext}
            filterOperations={filterOperations}
            onRemove={onRemove}
            onCreate={noop}
            suggestedPriority={suggestedPriority}
          />
        </div>
      ))}
      <DimensionPanel
        data-test-subj={`lns_multi_column_add_${testSubj}`}
        columnId={''}
        datasource={datasource}
        layerId={layerId}
        dragDropContext={dragDropContext}
        filterOperations={filterOperations}
        onCreate={onAdd}
        onRemove={noop}
      />
    </>
  );
}
