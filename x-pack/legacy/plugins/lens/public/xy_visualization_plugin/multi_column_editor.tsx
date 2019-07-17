/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../native_renderer';
import { generateId } from '../id_generator';
import { DatasourcePublicAPI, Operation } from '../types';
import { DragContextState } from '../drag_drop';

interface Props {
  accessors: string[];
  datasource: DatasourcePublicAPI;
  dragDropContext: DragContextState;
  onRemove: (accessor: string) => void;
  onAdd: (accessor: string) => void;
  filterOperations: (op: Operation) => boolean;
  suggestedPriority?: 0 | 1 | 2 | undefined;
  testSubj: string;
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
}: Props) {
  return (
    <>
      {accessors.map((accessor, i) => (
        <div key={accessor}>
          <NativeRenderer
            data-test-subj={`lnsXY_${testSubj}_${accessor}`}
            render={datasource.renderDimensionPanel}
            nativeProps={{
              columnId: accessor,
              dragDropContext,
              filterOperations,
              suggestedPriority,
            }}
          />
          {i === accessors.length - 1 ? null : (
            <EuiButtonIcon
              size="s"
              color="warning"
              data-test-subj={`lnsXY_${testSubj}_remove_${accessor}`}
              iconType="trash"
              onClick={() => {
                datasource.removeColumnInTableSpec(accessor);
                onRemove(accessor);
              }}
              aria-label={i18n.translate('xpack.lens.xyChart.removeAriaLabel', {
                defaultMessage: 'Remove',
              })}
            />
          )}
        </div>
      ))}
      <EuiButton
        data-test-subj={`lnsXY_${testSubj}_add`}
        onClick={() => onAdd(generateId())}
        iconType="plusInCircle"
      />
    </>
  );
}
