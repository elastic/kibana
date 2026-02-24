/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';

interface EsqlQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  dataTestSubj?: string;
}

export const EsqlQueryEditor = ({
  value,
  onChange,
  isDisabled = false,
  isLoading = false,
  dataTestSubj,
}: EsqlQueryEditorProps) => {
  const query = useMemo((): AggregateQuery => ({ esql: value }), [value]);

  const handleQueryChange = useCallback(
    (next: AggregateQuery) => {
      if ('esql' in next) {
        onChange(next.esql);
      }
    },
    [onChange]
  );

  const handleQuerySubmit = useCallback(async () => {}, []);

  return (
    <ESQLLangEditor
      query={query}
      onTextLangQueryChange={handleQueryChange}
      onTextLangQuerySubmit={handleQuerySubmit}
      disableAutoFocus
      editorIsInline
      expandToFitQueryOnMount
      hasOutline
      hideRunQueryButton
      hideQueryHistory
      isDisabled={isDisabled}
      isLoading={isLoading}
      dataTestSubj={dataTestSubj}
    />
  );
};
