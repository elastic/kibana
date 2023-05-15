/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiTableFieldDataColumnType,
  Search,
  EuiInMemoryTable,
  EuiTitle,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import * as i18n from './translations';
import type { EnrichedFieldMetadata, OnInValidValueUpdateCallback } from '../types';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';

const search: Search = {
  box: {
    incremental: true,
    placeholder: i18n.SEARCH_FIELDS,
    schema: true,
  },
};

interface Props {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  getTableColumns: (
    onInValidValueUpdateCallback?: OnInValidValueUpdateCallback
  ) => Array<EuiTableFieldDataColumnType<EnrichedFieldMetadata>>;
  title: string;
  onInValidValueUpdateCallback?: OnInValidValueUpdateCallback;
  indexName: string;
  indexTemplate?: string;
  bulkFix?: (params: unknown) => void;
  disableBulkFixButton?: boolean;
}

const CompareFieldsTableComponent: React.FC<Props> = ({
  enrichedFieldMetadata,
  getTableColumns,
  title,
  onInValidValueUpdateCallback,
  bulkFix,
  indexName,
  indexTemplate,
  disableBulkFixButton,
  bulkFixResult,
}) => {
  const columns = useMemo(
    () => getTableColumns(onInValidValueUpdateCallback),
    [getTableColumns, onInValidValueUpdateCallback]
  );
  const { toasts } = useDataQualityContext();
  const handleButtonFix = useCallback(async () => {
    const expectedMappings = enrichedFieldMetadata.reduce<Record<string, string>>((acc, data) => {
      if (data.indexFieldName && data.type) {
        acc[data.indexFieldName] = data.type;
      }
      return acc;
    }, {});
    await bulkFix?.({ body: { indexName, indexTemplate, expectedMappings }, toasts });
    onInValidValueUpdateCallback?.();
  }, [
    bulkFix,
    enrichedFieldMetadata,
    indexName,
    indexTemplate,
    onInValidValueUpdateCallback,
    toasts,
  ]);
  return (
    <>
      <EuiTitle size="xs">
        <span data-test-subj="title">{title}</span>
      </EuiTitle>
      {bulkFix && (
        <EuiButtonIcon
          iconType="wrench"
          onClick={handleButtonFix}
          disabled={disableBulkFixButton}
          aria-label={'Fix it'}
        />
      )}
      {bulkFixResult && (
        <EuiCodeBlock fontSize="m" paddingSize="m" lineNumbers>
          {JSON.stringify(bulkFixResult)}
        </EuiCodeBlock>
      )}
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        columns={columns}
        data-test-subj="table"
        items={enrichedFieldMetadata}
        search={search}
        sorting={true}
        pagination={true}
      />
    </>
  );
};

export const CompareFieldsTable = React.memo(CompareFieldsTableComponent);
