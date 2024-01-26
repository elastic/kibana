/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType, Search } from '@elastic/eui';
import { EuiInMemoryTable, EuiTitle, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from './translations';
import type { EnrichedFieldMetadata } from '../types';

const search: Search = {
  box: {
    incremental: true,
    placeholder: i18n.SEARCH_FIELDS,
    schema: true,
  },
};

interface Props {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  getTableColumns: () => Array<EuiTableFieldDataColumnType<EnrichedFieldMetadata>>;
  title: string;
}

const CompareFieldsTableComponent: React.FC<Props> = ({
  enrichedFieldMetadata,
  getTableColumns,
  title,
}) => {
  const columns = useMemo(() => getTableColumns(), [getTableColumns]);

  return (
    <>
      <EuiTitle size="xs">
        <span data-test-subj="title">{title}</span>
      </EuiTitle>
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

CompareFieldsTableComponent.displayName = 'CompareFieldsTableComponent';

export const CompareFieldsTable = React.memo(CompareFieldsTableComponent);
