/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { DEFAULT_TABLE_COLUMN_NAMES } from '../data_management/schema_editor/constants';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { SchemaEditor } from '../data_management/schema_editor';
import { useKibana } from '../../hooks/use_kibana';
import type { SchemaEditorField } from '../data_management/schema_editor/types';

const defaultColumns = DEFAULT_TABLE_COLUMN_NAMES.filter(
  (column) => column !== 'parent' && column !== 'format'
);

interface QueryStreamSchemaEditorProps {
  definition: Streams.QueryStream.GetResponse;
  refreshDefinition: () => void;
}

export const QueryStreamSchemaEditor = ({
  definition,
  refreshDefinition,
}: QueryStreamSchemaEditorProps) => {
  const { loading } = useStreamDetail();

  const { fields, isLoadingFields, refreshFields } = useQueryStreamSchemaFields({
    definition,
    refreshDefinition,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
      <EuiCallOut
        iconType="info"
        title={i18n.translate('xpack.streams.queryStreamSchemaEditor.readonlyMode', {
          defaultMessage: 'Query streams are readonly and their schema cannot be modified.',
        })}
        announceOnMount={false}
        size="s"
      />
      <EuiSpacer size="m" />
      <EuiFlexItem grow={1} css={{ minHeight: 0 }}>
        <SchemaEditor
          fields={fields}
          isLoading={loading || isLoadingFields}
          defaultColumns={defaultColumns}
          stream={definition.stream}
          onRefreshData={refreshFields}
          onFieldUpdate={() => {}}
          onFieldSelection={() => {}}
          fieldSelection={[]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const useQueryStreamSchemaFields = ({ definition }: QueryStreamSchemaEditorProps) => {
  const { data } = useKibana().dependencies.start;
  const esqlQuery = definition.stream.query.esql;

  const {
    value = [],
    loading,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => {
      if (!esqlQuery) {
        return [] as SchemaEditorField[];
      }
      const columns = await getESQLQueryColumns({
        esqlQuery,
        search: data.search.search,
        signal,
      });

      return columns.map((column) => ({
        name: column.name,
        type: column.meta.type,
        parent: definition.stream.name,
        status: 'mapped',
      })) as SchemaEditorField[];
    },
    [data.search, esqlQuery, definition.stream.name]
  );

  return {
    fields: value,
    isLoadingFields: loading,
    refreshFields: refresh,
  };
};
