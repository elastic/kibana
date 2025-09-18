/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiPortal, EuiProgress } from '@elastic/eui';
import { css } from '@emotion/css';
import { useControls } from './hooks/use_controls';
import type { SchemaEditorProps } from './types';
import { SchemaEditorContextProvider } from './schema_editor_context';
import { Controls } from './schema_editor_controls';
import { FieldsTable } from './schema_editor_table';
import { SUPPORTED_TABLE_COLUMN_NAMES } from './constants';

export function SchemaEditor({
  defaultColumns = SUPPORTED_TABLE_COLUMN_NAMES,
  fields,
  isLoading,
  onFieldUpdate,
  onRefreshData,
  stream,
  withControls = false,
  withFieldSimulation = false,
  withTableActions = false,
  withToolbar = true,
}: SchemaEditorProps) {
  const [controls, updateControls] = useControls();

  return (
    <SchemaEditorContextProvider
      fields={fields}
      isLoading={isLoading}
      onFieldUpdate={onFieldUpdate}
      stream={stream}
      withControls={withControls}
      withFieldSimulation={withFieldSimulation}
      withTableActions={withTableActions}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        className={css`
          min-height: 0;

          & .euiDataGrid__focusWrap {
            min-height: 0;
          }
        `}
      >
        {isLoading ? (
          <EuiPortal>
            <EuiProgress size="xs" color="accent" position="fixed" />
          </EuiPortal>
        ) : null}
        {withControls && (
          <Controls controls={controls} onChange={updateControls} onRefreshData={onRefreshData} />
        )}
        <FieldsTable
          isLoading={isLoading ?? false}
          controls={controls}
          withToolbar={withToolbar}
          defaultColumns={defaultColumns}
          fields={fields}
          stream={stream}
          withTableActions={withTableActions}
        />
      </EuiFlexGroup>
    </SchemaEditorContextProvider>
  );
}
