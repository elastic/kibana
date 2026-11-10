/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiCodeBlock, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FieldValue } from '../../../common/types';
import { AppLink } from '../components/app_link';
import { ErrorCallout } from '../components/error_callout';
import { PageLayout } from '../components/page_layout';
import { ValueCell } from '../components/value_cell';
import { decodeParam, indexPath } from '../lib/paths';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

interface FieldRow {
  readonly field: string;
  readonly value: FieldValue;
}

const FIELD_COLUMNS: Array<EuiBasicTableColumn<FieldRow>> = [
  { field: 'field', name: i18nTexts.fieldColumn, width: '30%' },
  {
    field: 'value',
    name: i18nTexts.valueColumn,
    render: (value: FieldValue) => <ValueCell value={value} />,
  },
];

/** Single document view: flattened field table plus the raw `_source`. */
export function DocumentPage() {
  const { api } = useServices();
  const params = useParams<{ index: string; id: string }>();
  const index = decodeParam(params.index);
  const id = decodeParam(params.id);
  const {
    value: document,
    error,
    loading,
  } = useAsync(() => api.getDocument(index, id), [api, index, id]);

  const fieldRows: FieldRow[] = Object.entries(document?.values ?? {})
    .map(([field, value]) => ({ field, value }))
    .sort((left, right) => left.field.localeCompare(right.field));

  return (
    <PageLayout
      title={id}
      documentTitle={`${index}/${id}`}
      breadcrumbs={[{ text: index, path: indexPath(index) }, { text: id }]}
      description={
        document ? (
          <>
            {i18nTexts.documentIndexLabel}{' '}
            <AppLink path={indexPath(document._index)}>{document._index}</AppLink>
          </>
        ) : undefined
      }
    >
      {loading ? <EuiLoadingSpinner size="l" /> : null}
      {error ? <ErrorCallout title={i18nTexts.loadDocumentError} error={error} /> : null}
      {document ? (
        <>
          <EuiBasicTable<FieldRow>
            tableCaption={i18nTexts.fieldsTableCaption}
            items={fieldRows}
            itemId="field"
            columns={FIELD_COLUMNS}
            data-test-subj="indexExplorerDocumentFields"
          />
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h2>{i18nTexts.sourceTitle}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="json"
            isCopyable
            paddingSize="m"
            data-test-subj="indexExplorerDocumentSource"
          >
            {JSON.stringify(document.source, null, 2)}
          </EuiCodeBlock>
        </>
      ) : null}
    </PageLayout>
  );
}
