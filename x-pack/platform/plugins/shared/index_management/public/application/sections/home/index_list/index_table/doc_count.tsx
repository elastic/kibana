/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { docCountApi } from './get_doc_count';
interface DocCountCellProps {
  indexName: string;
  docCountApi: ReturnType<typeof docCountApi>;
}

export const DocCountCell = ({ indexName, docCountApi }: DocCountCellProps) => {
  const docCountResponse = useObservable<Record<string, number>>(docCountApi.getObservable());
  const count = docCountResponse ? docCountResponse[indexName] : undefined;

  // todo account for error state
  useEffect(() => {
    docCountApi.getByName(indexName);
    // todo this errors and breaks reloading indices button
    // return () => docCountApi.abort();
  }, [docCountApi, indexName]);

  if (count === undefined) {
    return <EuiLoadingSpinner size="m" />;
  }

  return Number(count).toLocaleString();
};
