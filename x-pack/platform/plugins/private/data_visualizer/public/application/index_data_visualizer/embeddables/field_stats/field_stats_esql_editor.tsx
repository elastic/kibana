/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback } from 'react';
import { ESQLLangEditor } from '@kbn/esql/public';
import { EuiFlexItem } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';

interface FieldStatsESQLEditorProps {
  canEditTextBasedQuery?: boolean;
  query: AggregateQuery;
  setQuery: (query: AggregateQuery) => void;
  onQuerySubmit: (query: AggregateQuery, abortController?: AbortController) => Promise<void>;
  disableSubmitAction?: boolean;
}
export const FieldStatsESQLEditor = ({
  canEditTextBasedQuery = true,
  query,
  setQuery,
  onQuerySubmit,
  disableSubmitAction = false,
}: FieldStatsESQLEditorProps) => {
  const prevQuery = useRef<AggregateQuery>(query);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);

  const onTextLangQuerySubmit = useCallback(
    async (q?: AggregateQuery, abortController?: AbortController) => {
      if (q && onQuerySubmit) {
        setIsVisualizationLoading(true);
        await onQuerySubmit(q, abortController);
        setIsVisualizationLoading(false);
      }
    },
    [onQuerySubmit]
  );

  if (!canEditTextBasedQuery) return null;

  return (
    <EuiFlexItem grow={false} data-test-subj="InlineEditingESQLEditor">
      <ESQLLangEditor
        query={query}
        onTextLangQueryChange={(q) => {
          setQuery(q);
          prevQuery.current = q;
        }}
        editorIsInline
        onTextLangQuerySubmit={onTextLangQuerySubmit}
        allowQueryCancellation={false}
        disableSubmitAction={disableSubmitAction}
        isLoading={isVisualizationLoading}
      />
    </EuiFlexItem>
  );
};
