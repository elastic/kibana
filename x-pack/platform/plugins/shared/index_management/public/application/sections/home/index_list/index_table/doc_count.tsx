/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { INTERNAL_API_BASE_PATH } from '../../../../../../common/constants';

interface DocCountCellProps {
  indexName: string;
  httpSetup: HttpSetup;
}

export const DocCountCell = ({ indexName, httpSetup }: DocCountCellProps) => {
  const [count, setCount] = React.useState<number>();
  const [countError, setCountError] = React.useState<boolean>(false);

  useEffect(() => {
    // Avoid duplicate requests
    if (count !== undefined || countError) {
      return;
    }
    httpSetup
      .get<{ count: number }>(
        `${INTERNAL_API_BASE_PATH}/index_doc_count/${encodeURIComponent(indexName)}`
      )
      .then((response) => {
        setCount(response.count);
      })
      .catch(() => {
        setCountError(true);
      });
  });

  if (countError) {
    return (
      <span data-test-subj="docCountError">
        <FormattedMessage defaultMessage="Error" id="xpack.idxMgmt.indexTable.docCountError" />
      </span>
    );
  }

  return !count ? <EuiLoadingSpinner size="m" /> : count;
};
