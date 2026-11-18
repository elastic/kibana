/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import {
  useContentListItems,
  useContentListPagination,
  useContentListPhase,
} from '@kbn/content-list-provider';
import { getShowingOneLabel, getShowingRangeLabel } from '../translations';

interface TableCountProps {
  formatTotal: (count: number) => string;
  'data-test-subj'?: string;
}

export const TableCount = ({ formatTotal, 'data-test-subj': dataTestSubj }: TableCountProps) => {
  const phase = useContentListPhase();
  const { totalItems } = useContentListItems();
  const { pageIndex, pageSize } = useContentListPagination();

  if (phase === 'initialLoad' || totalItems === 0) {
    return null;
  }

  const first = pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, totalItems);
  const total = formatTotal(totalItems);

  return (
    <EuiText size="xs" color="subdued" aria-live="polite" data-test-subj={dataTestSubj}>
      {totalItems === 1
        ? getShowingOneLabel(first, total)
        : getShowingRangeLabel(first, last, total)}
    </EuiText>
  );
};
