/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TableCountProps {
  pageIndex: number;
  pageSize: number;
  /** How many rows the search and filters leave, across every page. */
  total: number;
  /** The total with what it counts, such as "7 data streams". */
  formatTotal: (count: number) => string;
  'data-test-subj'?: string;
}

/** Which of a table's rows its page shows, of all that its search and filters leave. */
export const TableCount = ({
  pageIndex,
  pageSize,
  total,
  formatTotal,
  'data-test-subj': dataTestSubj,
}: TableCountProps) => {
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, total);
  return (
    <>
      <EuiText size="xs" color="subdued" aria-live="polite" data-test-subj={dataTestSubj}>
        {i18n.translate('xpack.boost.tableCount.showing', {
          defaultMessage: 'Showing {range} of {total}',
          values: {
            range: first === last ? String(first) : `${first}–${last}`,
            total: formatTotal(total),
          },
        })}
      </EuiText>
      {/* As far from the table as the table's other neighbors. */}
      <EuiSpacer size="m" />
    </>
  );
};
