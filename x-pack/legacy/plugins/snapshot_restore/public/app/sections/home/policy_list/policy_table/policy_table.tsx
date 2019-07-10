/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiInMemoryTable } from '@elastic/eui';

import { SlmPolicy } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';
import { formatDate } from '../../../../services/text';

interface Props {
  policies: SlmPolicy[];
  reload: () => Promise<void>;
}

export const PolicyTable: React.FunctionComponent<Props> = ({ policies, reload }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.policyNameColumnTitle', {
        defaultMessage: 'Policy',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'snapshotName',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.snapshotNameColumnTitle', {
        defaultMessage: 'Snapshot name',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'schedule',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.scheduleColumnTitle', {
        defaultMessage: 'Schedule',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'nextExecutionMillis',
      name: i18n.translate('xpack.snapshotRestore.policyList.table.nextExecutionColumnTitle', {
        defaultMessage: 'Next execution',
      }),
      truncateText: true,
      sortable: true,
      render: (nextExecutionMillis: SlmPolicy['nextExecutionMillis']) =>
        formatDate(nextExecutionMillis),
    },
  ];

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const search = {
    toolsRight: (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
        <EuiFlexItem>
          <EuiButton
            color="secondary"
            iconType="refresh"
            onClick={reload}
            data-test-subj="reloadButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyList.table.reloadPoliciesButton"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'repository',
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.policyList.table.repositoryFilterLabel"
            defaultMessage="Repository"
          />
        ),
        multiSelect: false,
        options: Object.keys(
          policies.reduce((repositoriesMap: any, policy) => {
            repositoriesMap[policy.repository] = true;
            return repositoriesMap;
          }, {})
        ).map(repository => {
          return {
            value: repository,
            view: repository,
          };
        }),
      },
    ],
  };

  return (
    <EuiInMemoryTable
      items={policies}
      itemId="name"
      columns={columns}
      search={search}
      sorting={sorting}
      pagination={pagination}
      isSelectable={true}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `cell`,
      })}
      data-test-subj="policyTable"
    />
  );
};
