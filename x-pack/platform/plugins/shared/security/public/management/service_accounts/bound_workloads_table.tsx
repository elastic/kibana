/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPagination,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ServiceAccountBoundWorkload } from '@kbn/core-security-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const WORKLOADS_PAGE_SIZE = 5;

/**
 * A bound workload as the table shows it. The same workload id can be bound in more than one
 * space, and the space is not reported, so rows are keyed by position.
 */
interface WorkloadRow extends ServiceAccountBoundWorkload {
  rowKey: number;
}

const workloadColumns: Array<EuiBasicTableColumn<WorkloadRow>> = [
  {
    field: 'displayName',
    name: i18n.translate('xpack.security.management.serviceAccounts.boundWorkloads.nameColumn', {
      defaultMessage: 'Name',
    }),
    truncateText: true,
    // The link already carries the base path and the space of the binding, which may not be the
    // current one, so it goes in as is rather than through `basePath.prepend`.
    render: (displayName: string, { href }: WorkloadRow) =>
      href ? (
        <EuiLink
          href={href}
          target="_blank"
          external
          data-test-subj="serviceAccountBoundWorkloadLink"
        >
          {displayName}
        </EuiLink>
      ) : (
        displayName
      ),
  },
  {
    field: 'workloadType',
    name: i18n.translate('xpack.security.management.serviceAccounts.boundWorkloads.typeColumn', {
      defaultMessage: 'Type',
    }),
    render: (workloadType: string, { typeName }: WorkloadRow) => (
      <EuiBadge color="hollow">{typeName ?? workloadType}</EuiBadge>
    ),
  },
];

/** A paged list of the workloads bound to a service account. */
export const BoundWorkloadsTable = ({
  workloads,
}: {
  workloads: ServiceAccountBoundWorkload[];
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [minTableHeight, setMinTableHeight] = useState<number>();
  const tableRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => workloads.map((workload, rowKey): WorkloadRow => ({ ...workload, rowKey })),
    [workloads]
  );
  const pageCount = Math.ceil(rows.length / WORKLOADS_PAGE_SIZE);
  const firstRow = pageIndex * WORKLOADS_PAGE_SIZE;
  const pageRows = rows.slice(firstRow, firstRow + WORKLOADS_PAGE_SIZE);

  // A short last page would pull the pagination and the modal footer up with it, so the table
  // keeps the height of the tallest page it has shown.
  useLayoutEffect(() => {
    const height = tableRef.current?.offsetHeight;
    if (height) setMinTableHeight((current) => Math.max(current ?? 0, height));
  }, [pageIndex]);

  if (rows.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="serviceAccountBoundWorkloadsEmpty">
        <p>
          {i18n.translate('xpack.security.management.serviceAccounts.boundWorkloads.empty', {
            defaultMessage: 'No workloads are bound to this account.',
          })}
        </p>
      </EuiText>
    );
  }

  return (
    <>
      <EuiText size="xs" data-test-subj="serviceAccountBoundWorkloadsSummary">
        <FormattedMessage
          id="xpack.security.management.serviceAccounts.boundWorkloads.summary"
          defaultMessage="Showing {start}-{end}"
          values={{
            start: <strong>{firstRow + 1}</strong>,
            end: <strong>{firstRow + pageRows.length}</strong>,
          }}
        />
      </EuiText>
      <div ref={tableRef} style={minTableHeight ? { minHeight: minTableHeight } : undefined}>
        <EuiBasicTable
          itemId="rowKey"
          items={pageRows}
          columns={workloadColumns}
          tableCaption={i18n.translate(
            'xpack.security.management.serviceAccounts.boundWorkloads.tableCaption',
            { defaultMessage: 'Bound workloads' }
          )}
          data-test-subj="serviceAccountBoundWorkloadsTable"
        />
      </div>
      {pageCount > 1 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiPagination
                aria-label={i18n.translate(
                  'xpack.security.management.serviceAccounts.boundWorkloads.pagination',
                  { defaultMessage: 'Bound workloads pages' }
                )}
                pageCount={pageCount}
                activePage={pageIndex}
                onPageClick={setPageIndex}
                data-test-subj="serviceAccountBoundWorkloadsPagination"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
