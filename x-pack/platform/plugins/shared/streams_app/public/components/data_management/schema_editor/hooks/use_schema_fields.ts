/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  FieldDefinitionConfig,
  NamedFieldDefinitionConfig,
  Streams,
} from '@kbn/streams-schema';
import { getAdvancedParameters } from '@kbn/streams-schema';
import { isEqual, omit } from 'lodash';
import { useMemo, useCallback, useState } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import type { SchemaField } from '../types';
import { isSchemaFieldTyped } from '../types';
import { convertToFieldDefinitionConfig } from '../utils';
import { getFormattedError } from '../../../../util/errors';

export const useSchemaFields = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
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

  const fields = useMemo(() => {
    const inheritedFields: SchemaField[] = Object.entries(definition.inherited_fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: 'format' in field ? field.format : undefined,
        additionalParameters: getAdvancedParameters(name, field),
        parent: field.from,
        alias_for: field.alias_for,
        status: 'inherited',
      })
    );

    const mappedFields: SchemaField[] = Object.entries(definition.stream.ingest.wired.fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: 'format' in field ? field.format : undefined,
        additionalParameters: getAdvancedParameters(name, field),
        parent: definition.stream.name,
        status: 'mapped',
      })
    );

    const unmappedFields: SchemaField[] =
      unmappedFieldsValue?.unmappedFields.map((field) => ({
        name: field,
        parent: definition.stream.name,
        status: 'unmapped',
      })) ?? [];

    return [...inheritedFields, ...mappedFields, ...unmappedFields];
  }, [definition, unmappedFieldsValue]);

  const refreshFields = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
  }, [refreshDefinition, refreshUnmappedFields]);

  const [stagedFields, setStagedFields] = useState<SchemaField[]>([]);

  const commitStagedFields = useCallback(async () => {
    if (stagedFields.length === 0) {
      return;
    }
    try {
      const nextFields = stagedFields.reduce((acc, field) => {
        if (!isSchemaFieldTyped(field)) {
          // just skip it
          return acc;
        }
        acc[field.name] = convertToFieldDefinitionConfig(field);
        return acc;
      }, {} as Record<string, FieldDefinitionConfig>);

      const removedFields = stagedFields
        .filter((field) => field.status === 'unmapped')
        .map((field) => field.name);

      const fieldsToUpdate = {
        ...definition.stream.ingest.wired.fields,
        ...nextFields,
      };
      if (removedFields.length > 0) {
        removedFields.forEach((fieldName) => {
          delete fieldsToUpdate[fieldName];
        });
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
              wired: {
                ...definition.stream.ingest.wired,
                fields: fieldsToUpdate,
              },
            },
          },
        },
      });
      toasts.addSuccess(
        i18n.translate('xpack.streams.streamDetailSchemaEditorCommitSuccessToast', {
          defaultMessage: 'Fields were successfully committed',
        })
      );
      setStagedFields([]);
      refreshFields();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorCommitErrorToast', {
          defaultMessage: 'Something went wrong committing the fields',
        }),
        toastMessage: getFormattedError(error).message,
        toastLifeTimeMs: 5000,
      });
    }
  }, [
    abortController.signal,
    definition.stream.ingest,
    definition.stream.name,
    refreshFields,
    stagedFields,
    streamsRepositoryClient,
    toasts,
  ]);

  const updateField = useCallback(
    async (field: SchemaField) => {
      try {
        if (!isSchemaFieldTyped(field)) {
          throw new Error('The field is not complete or fully mapped.');
        }

        const nextFieldDefinitionConfig = convertToFieldDefinitionConfig(field);
        const persistedFieldDefinitionConfig = definition.stream.ingest.wired.fields[field.name];

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
                wired: {
                  ...definition.stream.ingest.wired,
                  fields: {
                    ...definition.stream.ingest.wired.fields,
                    [field.name]: nextFieldDefinitionConfig,
                  },
                },
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
        const persistedFieldDefinitionConfig = definition.stream.ingest.wired.fields[fieldName];

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
                wired: {
                  ...definition.stream.ingest.wired,
                  fields: omit(definition.stream.ingest.wired.fields, fieldName),
                },
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
    isLoadingUnmappedFields,
    refreshFields,
    unmapField,
    updateField,
    commitStagedFields,
    setStagedFields,
    stagedFields,
  };
};

const hasChanges = (
  field: Partial<NamedFieldDefinitionConfig>,
  fieldUpdate: Partial<NamedFieldDefinitionConfig>
) => {
  return !isEqual(field, fieldUpdate);
};
