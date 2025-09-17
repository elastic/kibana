/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { getAdvancedParameters } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import { useMemo, useCallback, useState } from 'react';
import { useAbortController, useAbortableAsync } from '@kbn/react-hooks';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MappedSchemaField, SchemaField } from '../types';
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

  const [fields, setFields] = useState<SchemaField[]>([]);

  const storedFields = useMemo(() => {
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
        : definition.stream.ingest.classic.field_overrides || {}
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
          .filter(
            (field) =>
              !field.runtimeField && !field.metadata_field && !allManagedFieldsSet.has(field.name)
          )
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

    const nextStoredFields = [
      ...inheritedFields,
      ...mappedFields,
      ...unmanagedFields,
      ...unmappedFields,
    ];
    setFields(nextStoredFields);
    return nextStoredFields;
  }, [dataViewFields, definition, unmappedFieldsValue?.unmappedFields]);

  const refreshFields = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
    refreshDataViewFields();
  }, [refreshDefinition, refreshUnmappedFields, refreshDataViewFields]);

  const updateField = useCallback(
    async (field: SchemaField) => {
      const index = fields.findIndex((f) => f.name === field.name);
      if (index === -1) {
        return;
      }

      const before = fields.slice(0, index);
      const after = fields.slice(index + 1);
      const nextFields = [...before, field, ...after];
      setFields(nextFields);
    },
    [fields]
  );

  const pendingChangesCount = useMemo(() => {
    const added = fields.length - storedFields.length;

    const changed = fields.filter((field) => {
      const stored = storedFields.find((storedField) => storedField.name === field.name);
      return stored && !isEqual(field, stored);
    }).length;

    return added + changed;
  }, [fields, storedFields]);

  const discardChanges = useCallback(() => {
    setFields(storedFields);
  }, [storedFields]);

  const submitChanges = useCallback(async () => {
    try {
      const mappedFields = fields
        .filter((field) => field.status === 'mapped')
        .reduce((acc, field) => {
          acc[field.name] = convertToFieldDefinitionConfig(field as MappedSchemaField);
          return acc;
        }, {} as Record<string, FieldDefinitionConfig>);

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
                      fields: mappedFields,
                    },
                  }
                : {
                    classic: {
                      ...definition.stream.ingest.classic,
                      field_overrides: mappedFields,
                    },
                  }),
            },
          },
        },
      });

      toasts.addSuccess(
        i18n.translate('xpack.streams.streamDetailSchemaEditorEditSuccessToast', {
          defaultMessage: 'Schema was successfully modified',
        })
      );

      refreshFields();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorEditErrorToast', {
          defaultMessage: 'Something went wrong when modifying the schema',
        }),
        toastMessage: getFormattedError(error).message,
        toastLifeTimeMs: 5000,
      });
    }
  }, [fields, streamsRepositoryClient, abortController.signal, definition, toasts, refreshFields]);

  return {
    fields,
    storedFields,
    isLoadingFields: isLoadingUnmappedFields || isLoadingDataViewFields,
    refreshFields,
    updateField,
    pendingChangesCount,
    discardChanges,
    submitChanges,
  };
};
