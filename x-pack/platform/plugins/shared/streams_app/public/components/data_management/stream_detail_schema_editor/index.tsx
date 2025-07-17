/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Streams, isRootStreamDefinition } from '@kbn/streams-schema';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { SchemaEditor } from '../schema_editor';
import { useSchemaFields } from '../schema_editor/hooks/use_schema_fields';
import { SUPPORTED_TABLE_COLUMN_NAMES } from '../schema_editor/constants';

interface SchemaEditorProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

const wiredDefaultColumns = SUPPORTED_TABLE_COLUMN_NAMES;
const classicDefaultColumns = SUPPORTED_TABLE_COLUMN_NAMES.filter((column) => column !== 'parent');

export const StreamDetailSchemaEditor = ({ definition, refreshDefinition }: SchemaEditorProps) => {
  const { loading } = useStreamDetail();

  const { fields, isLoadingFields, refreshFields, unmapField, updateField } = useSchemaFields({
    definition,
    refreshDefinition,
  });

  return (
    <SchemaEditor
      fields={fields}
      isLoading={loading || isLoadingFields}
      defaultColumns={
        Streams.WiredStream.GetResponse.is(definition) ? wiredDefaultColumns : classicDefaultColumns
      }
      stream={definition.stream}
      onFieldUnmap={unmapField}
      onFieldUpdate={updateField}
      onRefreshData={refreshFields}
      withControls
      withFieldSimulation
      withTableActions={!isRootStreamDefinition(definition.stream) && definition.privileges.manage}
    />
  );
};
