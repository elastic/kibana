/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isReadOnly?: boolean;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  value,
  onChange,
  isReadOnly = false,
}) => {
  const query: AggregateQuery = { esql: value };

  const handleQueryChange = (newQuery: AggregateQuery) => {
    onChange(newQuery.esql || '');
  };

  return (
    <ESQLLangEditor
      query={query}
      onTextLangQueryChange={handleQueryChange}
      onTextLangQuerySubmit={async () => {}}
      isDisabled={isReadOnly}
      hideRunQueryText={true}
      hideRunQueryButton={true}
      editorIsInline={true}
      disableSubmitAction={true}
      hasOutline={true}
      hideQueryHistory={true}
      hideQuickSearch={true}
      expandToFitQueryOnMount={true}
    />
  );
};
