/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { NativeRenderer } from '../native_renderer';
import { DatasourcePublicAPI, OperationMetadata } from '../types';
import { DragContextState } from '../drag_drop';

interface Props {
  accessors: string[];
  datasource: DatasourcePublicAPI;
  dragDropContext: DragContextState;
  onRemove: (accessor: string) => void;
  onAdd: () => void;
  filterOperations: (op: OperationMetadata) => boolean;
  suggestedPriority?: 0 | 1 | 2 | undefined;
  testSubj: string;
  layerId: string;
}

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
  const lastOperation = datasource.getOperationForColumnId(accessors[accessors.length - 1]);

  useEffect(() => {
    if (accessors.length === 0 || lastOperation !== null) {
      setTimeout(onAdd);
    }
  }, [lastOperation]);

  return (
    <>
      {accessors.map(accessor => (
        <div key={accessor}>
          <NativeRenderer
            data-test-subj={`lnsXY_${testSubj}_${accessor}`}
            render={datasource.renderDimensionPanel}
            nativeProps={{
              columnId: accessor,
              dragDropContext,
              filterOperations,
              suggestedPriority,
              layerId,
              onRemove,
            }}
          />
        </div>
      ))}
    </>
  );
}
