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

interface SchemaEditorProps {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}

export const StreamDetailSchemaEditor = ({ definition, refreshDefinition }: SchemaEditorProps) => {
  const { loading } = useStreamDetail();

  const { fields, isLoadingUnmappedFields, refreshFields, unmapField, updateField } =
    useSchemaFields({
      definition,
      refreshDefinition,
    });

  return (
    <SchemaEditor
      fields={fields}
      isLoading={loading || isLoadingUnmappedFields}
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
