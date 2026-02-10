/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useAbortController, useAbortableAsync } from '@kbn/react-hooks';
import { Streams, getAdvancedParameters } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { getFormattedError } from '../../../../util/errors';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';
import type { SchemaEditorField, SchemaField } from '../types';
import { buildSchemaSavePayload, isFieldUncommitted } from '../utils';

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
    services: { telemetryClient },
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
    const definitionFields = getDefinitionFields(definition);
    const allManagedFieldsSet = new Set([...definitionFields.map((field) => field.name)]);

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
      ...definitionFields.map((field) => field.name),
      ...unmanagedFields.map((field) => field.name),
    ]);

    const unmappedFields: SchemaField[] =
      (unmappedFieldsValue?.unmappedFields ?? [])
        .filter((field) => !allFoundFieldsSet.has(field))
        .map((field) => ({
          name: field,
          parent: definition.stream.name,
          status: 'unmapped',
        })) ?? [];

    return [...definitionFields, ...unmanagedFields, ...unmappedFields];
  }, [dataViewFields, definition, unmappedFieldsValue?.unmappedFields]);

  useEffect(() => setFields(storedFields), [storedFields]);

  const refreshFields = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
    refreshDataViewFields();
  }, [refreshDefinition, refreshUnmappedFields, refreshDataViewFields]);

  const addField = useCallback(
    (field: SchemaField) => {
      setFields([...fields, field]);
    },
    [fields]
  );

  const updateField = useCallback(
    (field: SchemaField) => {
      setFields((prevFields) => {
        const index = prevFields.findIndex((f) => f.name === field.name);
        if (index === -1) {
          return prevFields;
        }

        const before = prevFields.slice(0, index);
        const after = prevFields.slice(index + 1);
        return [...before, field, ...after];
      });
    },
    [setFields]
  );

  const pendingChangesCount = useMemo(() => {
    const addedOrChanged = fields.filter((field) => {
      const stored = storedFields.find((storedField) => storedField.name === field.name);
      if (!stored) {
        return field.status !== 'unmapped';
      }
      return !isEqual(field, stored);
    });

    return addedOrChanged.length;
  }, [fields, storedFields]);

  const discardChanges = useCallback(() => {
    setFields(storedFields);
  }, [storedFields]);

  const submitChanges = useCallback(async () => {
    try {
      const body = buildSchemaSavePayload(definition, fields);

      await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
        signal: abortController.signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          body,
        },
      });

      telemetryClient.trackSchemaUpdated({
        stream_type: getStreamTypeFromDefinition(definition.stream),
      });

      toasts.addSuccess(
        i18n.translate('xpack.streams.streamDetailSchemaEditorEditSuccessToast', {
          defaultMessage: 'Schema was successfully modified',
        })
      );

      refreshFields();
    } catch (error) {
      const formattedError = getFormattedError(error);
      toasts.addError(formattedError, {
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorEditErrorToast', {
          defaultMessage: 'Something went wrong when modifying the schema',
        }),
        toastMessage: formattedError.message,
        toastLifeTimeMs: 5000,
      });
    }
  }, [
    fields,
    streamsRepositoryClient,
    abortController.signal,
    definition,
    telemetryClient,
    toasts,
    refreshFields,
  ]);

  // Mark fields with uncommitted property for display
  const fieldsWithUncommittedStatus = useMemo<SchemaEditorField[]>(
    () =>
      fields.map((field) => ({
        ...field,
        uncommitted: isFieldUncommitted(field, storedFields),
      })),
    [fields, storedFields]
  );

  return {
    fields: fieldsWithUncommittedStatus,
    storedFields,
    isLoadingFields: isLoadingUnmappedFields || isLoadingDataViewFields,
    refreshFields,
    addField,
    updateField,
    pendingChangesCount,
    discardChanges,
    submitChanges,
  };
};

export const getDefinitionFields = (definition: Streams.ingest.all.GetResponse): SchemaField[] => {
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

  return [...mappedFields, ...inheritedFields];
};
