/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';

interface EsqlTabProps {
  onAdd: (query: string) => void;
}

// Reserved up front so the Add button does not jump while ESQLLangEditor mounts.
const EDITOR_INLINE_MIN_HEIGHT = 180;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

/**
 * Lets the user author a raw ES|QL query in the shared ES|QL editor and add it
 * as a source. The query is stored verbatim; no transformation or validation is
 * applied beyond trimming so empty queries cannot be added.
 */
export const EsqlTab = ({ onAdd }: EsqlTabProps) => {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const handleAdd = () => {
    if (!trimmedQuery) {
      return;
    }
    onAdd(trimmedQuery);
    setQuery('');
  };

  return (
    <div data-test-subj="contextEsqlTab">
      <EuiFormRow fullWidth>
        <div css={{ minHeight: EDITOR_INLINE_MIN_HEIGHT }}>
          <ESQLLangEditor
            query={{ esql: query }}
            onTextLangQueryChange={(next) => setQuery(getEsqlQuery(next))}
            onTextLangQuerySubmit={async () => {}}
            editorIsInline
            hasOutline
            hideRunQueryButton
            hideQueryHistory
            expandToFitQueryOnMount
            isLoading={false}
          />
        </div>
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiButton
        iconType="plusInCircle"
        onClick={handleAdd}
        isDisabled={!trimmedQuery}
        data-test-subj="contextAddEsqlSourceButton"
      >
        <FormattedMessage
          id="xpack.contextEngine.sourcePicker.esql.addButton"
          defaultMessage="Add ES|QL source"
        />
      </EuiButton>
    </div>
  );
};
