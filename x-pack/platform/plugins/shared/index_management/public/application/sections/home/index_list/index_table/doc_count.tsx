/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIndexDocCount } from '../../../../hooks/use_index_doc_count';

interface DocCountCellProps {
  indexName: string;
  httpSetup: HttpSetup;
  fallbackCount?: number;
}

export const DocCountCell = ({ indexName, httpSetup, fallbackCount }: DocCountCellProps) => {
  const { count, isError } = useIndexDocCount({ http: httpSetup, indexName });

  // Defensive fallback: in real runtime `httpSetup` should always exist. This mainly helps
  // environments/tests where core http isn't wired.
  if (!httpSetup || typeof (httpSetup as any).post !== 'function') {
    return fallbackCount !== undefined ? Number(fallbackCount).toLocaleString() : '—';
  }

  if (isError) {
    return (
      <span data-test-subj="docCountError">
        <FormattedMessage defaultMessage="Error" id="xpack.idxMgmt.indexTable.docCountError" />
      </span>
    );
  }

  if (count === undefined) {
    return <EuiLoadingSpinner size="m" />;
  }

  return Number(count).toLocaleString();
};
