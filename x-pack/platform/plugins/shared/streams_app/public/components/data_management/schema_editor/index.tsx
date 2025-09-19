/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  EuiProgress,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useControls } from './hooks/use_controls';
import type { SchemaEditorProps, SchemaField } from './types';
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
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);

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
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{selectedFields.length} selected</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              type="single"
              legend=""
              options={[
                {
                  id: 'guess',
                  label: i18n.translate('dataManagement.schemaEditor.guessType', {
                    defaultMessage: 'Guess type',
                  }),
                },
                {
                  id: 'unmap',
                  label: i18n.translate('dataManagement.schemaEditor.removeType', {
                    defaultMessage: 'Remove type (unmap)',
                  }),
                },
              ]}
              onChange={(id) => {
                if (id === 'guess') {
                } else if (id === 'unmap') {
                  selectedFields.forEach((fieldName) => {
                    const field = fields.find(({ name }) => name === fieldName)!;
                    onFieldUpdate({
                      name: field.name,
                      parent: field.parent,
                      status: 'unmapped',
                    } as SchemaField);
                  });

                  setSelectedFields([]);
                }
              }}
              idSelected=""
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <FieldsTable
          isLoading={isLoading ?? false}
          controls={controls}
          withToolbar={withToolbar}
          defaultColumns={defaultColumns}
          fields={fields}
          stream={stream}
          withTableActions={withTableActions}
          selectedFields={selectedFields}
          onFieldSelection={(name, checked) => {
            setSelectedFields((selection) => {
              if (checked) {
                return [...selection, name];
              } else {
                return selection.filter((field) => field !== name);
              }
            });
          }}
        />
      </EuiFlexGroup>
    </SchemaEditorContextProvider>
  );
}
