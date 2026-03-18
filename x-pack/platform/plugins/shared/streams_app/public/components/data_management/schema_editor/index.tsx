/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { getRegularEcsField } from '@kbn/streams-schema';
import { getFormattedError } from '../../../util/errors';
import { useControls } from './hooks/use_controls';
import { useKibana } from '../../../hooks/use_kibana';
import type { SchemaEditorProps, SchemaField } from './types';
import { SchemaEditorContextProvider } from './schema_editor_context';
import { Controls } from './schema_editor_controls';
import { FieldsTable } from './schema_editor_table';
import { DEFAULT_TABLE_COLUMN_NAMES, FIELD_TYPE_MAP } from './constants';

export function SchemaEditor({
  defaultColumns = DEFAULT_TABLE_COLUMN_NAMES,
  fields,
  isLoading,
  onFieldUpdate,
  onAddField,
  onRefreshData,
  onFieldSelection,
  fieldSelection,
  stream,
  withControls = false,
  withFieldSimulation = false,
  withTableActions = false,
  withToolbar = true,
  enableGeoPointSuggestions = true,
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
          if (type && !FIELD_TYPE_MAP[type as keyof typeof FIELD_TYPE_MAP]) {
            return;
          }

          onFieldUpdate({
            ...originalField,
            type,
            status: type ? 'mapped' : 'unmapped',
          } as SchemaField);
        });
        onFieldSelection(selection, false);
      } catch (err) {
        notifications.toasts.addError(getFormattedError(err), {
          title: i18n.translate('xpack.streams.schemaEditor.fetchRecommendationsError', {
            defaultMessage: 'Error fetching field type recommendations',
          }),
        });
      } finally {
        setIsLoadingRecommendations(false);
      }
    },
    [fields, fieldsMetadata, notifications.toasts, onFieldSelection, onFieldUpdate]
  );

  const filteredFields = React.useMemo(() => {
    const geoPointFields = new Set(
      fields.filter((f) => f.type === 'geo_point' || f.esType === 'geo_point').map((f) => f.name)
    );

    return fields.filter((f) => {
      const latMatch = f.name.match(/^(.*)\.lat$/);
      const lonMatch = f.name.match(/^(.*)\.lon$/);

      if (latMatch && geoPointFields.has(latMatch[1])) return false;
      if (lonMatch && geoPointFields.has(lonMatch[1])) return false;

      return true;
    });
  }, [fields]);

  const toolbarVisibility = React.useMemo(() => {
    if (!withToolbar) {
      return false;
    }

    if (fieldSelection.length === 0) {
      return true;
    }

    return {
      additionalControls: {
        left: {
          append: (
            <EuiFlexGroup alignItems="center" gutterSize="xs" style={{ marginLeft: '10px' }}>
              <EuiFlexItem grow={false} style={{ marginRight: '10px' }}>
                <EuiText color="subdued" size="xs">
                  {i18n.translate(
                    'xpack.streams.streamDetailSchemaEditorFieldsTableFieldsSelectedCount',
                    {
                      defaultMessage: '{count} selected:',
                      values: { count: fieldSelection.length },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  size="xs"
                  isLoading={isLoadingRecommendations}
                  onClick={() => {
                    getRecommendations(fieldSelection);
                  }}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailSchemaEditorFieldsTableActions.guessType',
                    {
                      defaultMessage: 'Suggest type',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  size="xs"
                  onClick={() => {
                    fieldSelection.forEach((fieldName) => {
                      const field = fields.find(({ name }) => name === fieldName)!;
                      onFieldUpdate(omit({ ...field, status: 'unmapped' }, 'type') as SchemaField);
                      onFieldSelection(fieldSelection, false);
                    });
                  }}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailSchemaEditorFieldsTableActions.removeType',
                    {
                      defaultMessage: 'Remove type (unmap)',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
      },
    };
  }, [
    fields,
    getRecommendations,
    onFieldSelection,
    withToolbar,
    fieldSelection,
    onFieldUpdate,
    isLoadingRecommendations,
  ]);

  return (
    <SchemaEditorContextProvider
      fields={filteredFields}
      onFieldSelection={onFieldSelection}
      fieldSelection={fieldSelection}
      isLoading={isLoading}
      onFieldUpdate={onFieldUpdate}
      onAddField={onAddField}
      stream={stream}
      withControls={withControls}
      withFieldSimulation={withFieldSimulation}
      withTableActions={withTableActions}
      enableGeoPointSuggestions={enableGeoPointSuggestions}
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
          <Controls
            controls={controls}
            onAddField={onAddField}
            onChange={updateControls}
            onRefreshData={onRefreshData}
          />
        )}
        <FieldsTable
          isLoading={isLoading ?? false}
          controls={controls}
          withToolbar={toolbarVisibility}
          defaultColumns={defaultColumns}
          fields={filteredFields}
          stream={stream}
          withTableActions={withTableActions}
          selectedFields={fieldSelection}
          onFieldSelection={onFieldSelection}
        />
      </EuiFlexGroup>
    </SchemaEditorContextProvider>
  );
}
