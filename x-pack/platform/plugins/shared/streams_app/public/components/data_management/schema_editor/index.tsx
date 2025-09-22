/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPortal,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { getRegularEcsField } from '@kbn/streams-schema';
import { useControls } from './hooks/use_controls';
import { useKibana } from '../../../hooks/use_kibana';
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
  onFieldSelection,
  fieldSelection,
  stream,
  withControls = false,
  withFieldSimulation = false,
  withTableActions = false,
  withToolbar = true,
}: SchemaEditorProps) {
  const [controls, updateControls] = useControls();
  const [isLoadingRecommendations, setIsLoadingRecommendations] = React.useState(false);
  const {
    core: { notifications },
    dependencies: {
      start: { fieldsMetadata },
    },
  } = useKibana();

  const getRecommendations = React.useCallback(
    async (selection: string[]) => {
      setIsLoadingRecommendations(true);
      const client = await fieldsMetadata.getClient();
      const ecsToOriginalField = selection.reduce((acc, name) => {
        acc[getRegularEcsField(name)] = name;
        return acc;
      }, {} as Record<string, string>);

      try {
        const response = await client.find({
          attributes: ['type'],
          fieldNames: Object.keys(ecsToOriginalField),
        });

        Object.entries(response.fields).forEach(([key, value]) => {
          const originalField = fields.find(({ name }) => name === ecsToOriginalField[key])!;
          const type = value.type ?? originalField.type;
          onFieldUpdate({
            ...originalField,
            type,
            status: type ? 'mapped' : 'unmapped',
          } as SchemaField);
        });
        onFieldSelection(selection, false);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('dataManagement.schemaEditor.fetchRecommendationsError', {
            defaultMessage: 'Error fetching field type recommendations',
          }),
        });
      } finally {
        setIsLoadingRecommendations(false);
      }
    },
    [fieldSelection]
  );

  return (
    <SchemaEditorContextProvider
      fields={fields}
      onFieldSelection={onFieldSelection}
      fieldSelection={fieldSelection}
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
        {fieldSelection.length > 0 && (
          <EuiPanel paddingSize="s" hasShadow={false} hasBorder={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="s">
                  {i18n.translate('dataManagement.schemaEditor.selectedFields', {
                    defaultMessage: '{count} selected',
                    values: { count: fieldSelection.length },
                  })}
                </EuiText>
              </EuiFlexItem>
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
                      isLoading: isLoadingRecommendations,
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
                      getRecommendations(fieldSelection);
                    } else if (id === 'unmap') {
                      fieldSelection.forEach((fieldName) => {
                        const field = fields.find(({ name }) => name === fieldName)!;
                        onFieldUpdate({
                          name: field.name,
                          parent: field.parent,
                          status: 'unmapped',
                        } as SchemaField);
                      });
                      onFieldSelection(fieldSelection, false);
                    }
                  }}
                  idSelected=""
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}
        <FieldsTable
          isLoading={isLoading ?? false}
          controls={controls}
          withToolbar={withToolbar}
          defaultColumns={defaultColumns}
          fields={fields}
          stream={stream}
          withTableActions={withTableActions}
          selectedFields={fieldSelection}
          onFieldSelection={onFieldSelection}
        />
      </EuiFlexGroup>
    </SchemaEditorContextProvider>
  );
}
