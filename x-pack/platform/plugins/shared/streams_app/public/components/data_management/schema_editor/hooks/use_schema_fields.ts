/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NamedFieldDefinitionConfig, Streams, getAdvancedParameters } from '@kbn/streams-schema';
import { isEqual, omit } from 'lodash';
import { useMemo, useCallback } from 'react';
import { useAbortController, useAbortableAsync } from '@kbn/react-hooks';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { SchemaField, isSchemaFieldTyped } from '../types';
import { convertToFieldDefinitionConfig } from '../utils';
import { getFormattedError } from '../../../../util/errors';

export const useSchemaFields = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        data: { dataViews },
      },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const abortController = useAbortController();

  const {
    value: unmappedFieldsValue,
    loading: isLoadingUnmappedFields,
    refresh: refreshUnmappedFields,
  } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/schema/unmapped_fields', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
        },
      });
    },
    [definition.stream.name, streamsRepositoryClient]
  );

  const {
    value: dataViewFields,
    loading: isLoadingDataViewFields,
    refresh: refreshDataViewFields,
  } = useAbortableAsync(
    async ({ signal }) => {
      return dataViews.getFieldsForWildcard({
        pattern: definition.stream.name,
        abortSignal: signal,
        forceRefresh: true,
      });
    },
    [dataViews, definition.stream.name]
  );

  const fields = useMemo(() => {
    let inheritedFields: SchemaField[] = [];

    if (Streams.WiredStream.GetResponse.is(definition)) {
      inheritedFields = Object.entries(definition.inherited_fields).map(([name, field]) => ({
        name,
        type: field.type,
        format: 'format' in field ? field.format : undefined,
        additionalParameters: getAdvancedParameters(name, field),
        parent: field.from,
        alias_for: field.alias_for,
        status: 'inherited',
      }));
    }

    const mappedFields: SchemaField[] = Object.entries(
      Streams.WiredStream.GetResponse.is(definition)
        ? definition.stream.ingest.wired.fields
        : definition.stream.ingest.unwired.field_overrides || {}
    ).map(([name, field]) => ({
      name,
      type: field.type,
      format: 'format' in field ? field.format : undefined,
      additionalParameters: getAdvancedParameters(name, field),
      parent: definition.stream.name,
      status: 'mapped',
    }));

    const allManagedFieldsSet = new Set([
      ...inheritedFields.map((field) => field.name),
      ...mappedFields.map((field) => field.name),
    ]);

    const unmanagedFields: SchemaField[] = dataViewFields
      ? dataViewFields
          .filter((field) => !field.runtimeField && !field.metadata_field)
          .filter((field) => !allManagedFieldsSet.has(field.name))
          .map((field) => ({
            name: field.name,
            status: 'unmapped',
            esType: field.esTypes?.[0],
            parent: definition.stream.name,
          }))
      : [];

    const allFoundFieldsSet = new Set([
      ...inheritedFields.map((field) => field.name),
      ...mappedFields.map((field) => field.name),
      ...unmanagedFields.map((field) => field.name),
    ]);

    const unmappedFields: SchemaField[] =
      unmappedFieldsValue?.unmappedFields
        .filter((field) => !allFoundFieldsSet.has(field))
        .map((field) => ({
          name: field,
          parent: definition.stream.name,
          status: 'unmapped',
        })) ?? [];

    return [...inheritedFields, ...mappedFields, ...unmappedFields, ...unmanagedFields];
  }, [dataViewFields, definition, unmappedFieldsValue?.unmappedFields]);

  const refreshFields = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
    refreshDataViewFields();
  }, [refreshDefinition, refreshUnmappedFields, refreshDataViewFields]);

  const updateField = useCallback(
    async (field: SchemaField) => {
      try {
        if (!isSchemaFieldTyped(field)) {
          throw new Error('The field is not complete or fully mapped.');
        }

        const nextFieldDefinitionConfig = convertToFieldDefinitionConfig(field);
        const persistedFieldDefinitionConfig = Streams.WiredStream.GetResponse.is(definition)
          ? definition.stream.ingest.wired.fields[field.name]
          : definition.stream.ingest.unwired.field_overrides?.[field.name];

        if (!hasChanges(persistedFieldDefinitionConfig, nextFieldDefinitionConfig)) {
          throw new Error('The field is not different, hence updating is not necessary.');
        }

        await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
          signal: abortController.signal,
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              ingest: {
                ...definition.stream.ingest,
                ...(Streams.WiredStream.GetResponse.is(definition)
                  ? {
                      wired: {
                        ...definition.stream.ingest.wired,
                        fields: {
                          ...definition.stream.ingest.wired.fields,
                          [field.name]: nextFieldDefinitionConfig,
                        },
                      },
                    }
                  : {
                      unwired: {
                        ...definition.stream.ingest.unwired,
                        field_overrides: {
                          ...definition.stream.ingest.unwired.field_overrides,
                          [field.name]: nextFieldDefinitionConfig,
                        },
                      },
                    }),
              },
            },
          },
        });

        toasts.addSuccess(
          i18n.translate('xpack.streams.streamDetailSchemaEditorEditSuccessToast', {
            defaultMessage: '{field} was successfully edited',
            values: { field: field.name },
          })
        );

        refreshFields();
      } catch (error) {
        toasts.addError(new Error(error.body.message), {
          title: i18n.translate('xpack.streams.streamDetailSchemaEditorEditErrorToast', {
            defaultMessage: 'Something went wrong editing the {field} field',
            values: { field: field.name },
          }),
          toastMessage: getFormattedError(error).message,
          toastLifeTimeMs: 5000,
        });
      }
    },
    [abortController.signal, definition, refreshFields, streamsRepositoryClient, toasts]
  );

  const unmapField = useCallback(
    async (fieldName: SchemaField['name']) => {
      try {
        const persistedFieldDefinitionConfig = Streams.WiredStream.GetResponse.is(definition)
          ? definition.stream.ingest.wired.fields[fieldName]
          : definition.stream.ingest.unwired.field_overrides?.[fieldName];

        if (!persistedFieldDefinitionConfig) {
          throw new Error('The field is not mapped, hence it cannot be unmapped.');
        }

        await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
          signal: abortController.signal,
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              ingest: {
                ...definition.stream.ingest,
                ...(Streams.WiredStream.GetResponse.is(definition)
                  ? {
                      wired: {
                        ...definition.stream.ingest.wired,
                        fields: omit(definition.stream.ingest.wired.fields, fieldName),
                      },
                    }
                  : {
                      unwired: {
                        ...definition.stream.ingest.unwired,
                        field_overrides: omit(
                          definition.stream.ingest.unwired.field_overrides,
                          fieldName
                        ),
                      },
                    }),
              },
            },
          },
        });

        toasts.addSuccess(
          i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapSuccessToast', {
            defaultMessage: '{field} was successfully unmapped',
            values: { field: fieldName },
          })
        );

        refreshFields();
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapErrorToast', {
            defaultMessage: 'Something went wrong unmapping the {field} field',
            values: { field: fieldName },
          }),
          toastMessage: getFormattedError(error).message,
          toastLifeTimeMs: 5000,
        });
      }
    },
    [abortController.signal, definition, refreshFields, streamsRepositoryClient, toasts]
  );

  return {
    fields,
    isLoadingFields: isLoadingUnmappedFields || isLoadingDataViewFields,
    refreshFields,
    unmapField,
    updateField,
  };
};

const hasChanges = (
  field: Partial<NamedFieldDefinitionConfig> | undefined,
  fieldUpdate: Partial<NamedFieldDefinitionConfig>
) => {
  return !isEqual(field, fieldUpdate);
};
