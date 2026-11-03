/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import type { EsqlRequestBody } from '../../../common/types';
import { queryPath } from '../lib/paths';
import { serializeQueryViewState } from '../lib/query_url_state';
import { i18nTexts } from '../translations';
import { AppButton } from './app_link';

/** Path to the ES|QL query page, prefilled with the given query and parameter values. */
export function esqlEditPath(esql: EsqlRequestBody): string {
  return queryPath(serializeQueryViewState(esql));
}

/** "Edit in ES|QL" button linking to the query page. */
export function EditInEsqlButton({ esql }: { esql: EsqlRequestBody }) {
  return (
    <AppButton
      iconType="editorCodeBlock"
      path={esqlEditPath(esql)}
      data-test-subj="indexExplorerEditInEsql"
    >
      {i18nTexts.editInEsql}
    </AppButton>
  );
}

/** Collapsible display of the ES|QL query (and its parameters) behind a view. */
export function EsqlQueryPanel({ id, esql }: { id: string; esql: EsqlRequestBody }) {
  const { query, params } = esql;
  return (
    <EuiAccordion
      id={id}
      buttonContent={i18nTexts.generatedEsqlTitle}
      paddingSize="s"
      data-test-subj="indexExplorerGeneratedEsql"
    >
      <EuiCodeBlock language="esql" isCopyable paddingSize="s" fontSize="s">
        {query}
      </EuiCodeBlock>
      {params.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <strong>{i18nTexts.generatedEsqlParamsTitle}</strong>
          </EuiText>
          <EuiCodeBlock language="json" paddingSize="s" fontSize="s">
            {JSON.stringify(
              Object.fromEntries(params.map(({ name, value }) => [name, value])),
              null,
              2
            )}
          </EuiCodeBlock>
        </>
      ) : null}
    </EuiAccordion>
  );
}
