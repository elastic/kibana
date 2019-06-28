/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiInMemoryTable, EuiLink, Query, EuiLoadingSpinner } from '@elastic/eui';

import { SnapshotDetails } from '../../../../../../common/types';
import { SNAPSHOT_STATE, UIM_SNAPSHOT_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { formatDate } from '../../../../services/text';
import { linkToRepository } from '../../../../services/navigation';
import { uiMetricService } from '../../../../services/ui_metric';
import { DataPlaceholder } from '../../../../components';

interface Props {
  snapshots: SnapshotDetails[];
  repositories: string[];
  reload: () => Promise<void>;
  openSnapshotDetailsUrl: (repositoryName: string, snapshotId: string) => string;
  repositoryFilter?: string;
}

export const SnapshotTable: React.FunctionComponent<Props> = ({
  snapshots,
  repositories,
  reload,
  openSnapshotDetailsUrl,
  repositoryFilter,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;

  const columns = [
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
      truncateText: true,
      sortable: true,
      render: (snapshotId: string, snapshot: SnapshotDetails) => (
        <EuiLink
          onClick={() => trackUiMetric(UIM_SNAPSHOT_SHOW_DETAILS_CLICK)}
          href={openSnapshotDetailsUrl(snapshot.repository, snapshotId)}
          data-test-subj="snapshotLink"
        >
          {snapshotId}
        </EuiLink>
      ),
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
      truncateText: true,
      sortable: true,
      render: (repositoryName: string) => (
        <EuiLink href={linkToRepository(repositoryName)} data-test-subj="repositoryLink">
          {repositoryName}
        </EuiLink>
      ),
    },
    {
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startTimeInMillis: number) => (
        <DataPlaceholder data={startTimeInMillis}>{formatDate(startTimeInMillis)}</DataPlaceholder>
      ),
    },
    {
      field: 'durationInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (durationInMillis: number, { state }: SnapshotDetails) => {
        if (state === SNAPSHOT_STATE.IN_PROGRESS) {
          return <EuiLoadingSpinner size="m" />;
        }
        return (
          <DataPlaceholder data={durationInMillis}>
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.table.durationColumnValueLabel"
              defaultMessage="{seconds}s"
              values={{ seconds: Math.ceil(durationInMillis / 1000) }}
            />
          </DataPlaceholder>
        );
      },
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (indices: string[]) => indices.length,
    },
    {
      field: 'shards.total',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.shardsColumnTitle', {
        defaultMessage: 'Shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (totalShards: number) => totalShards,
    },
    {
      field: 'shards.failed',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.failedShardsColumnTitle', {
        defaultMessage: 'Failed shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (failedShards: number) => failedShards,
    },
  ];

  // By default, we'll display the most recent snapshots at the top of the table.
  const sorting = {
    sort: {
      field: 'startTimeInMillis',
      direction: 'desc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const searchSchema = {
    fields: {
      repository: {
        type: 'string',
      },
    },
  };

  const search = {
    toolsRight: (
      <EuiButton
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.table.reloadSnapshotsButton"
          defaultMessage="Reload"
        />
      </EuiButton>
    ),
    box: {
      incremental: true,
      schema: searchSchema,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'repository',
        name: 'Repository',
        multiSelect: false,
        options: repositories.map(repository => ({
          value: repository,
          view: repository,
        })),
      },
    ],
    defaultQuery: repositoryFilter
      ? Query.parse(`repository:'${repositoryFilter}'`, {
          schema: {
            ...searchSchema,
            strict: true,
          },
        })
      : '',
  };

  return (
    <EuiInMemoryTable
      items={snapshots}
      itemId="name"
      columns={columns}
      search={search}
      sorting={sorting}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="snapshotTable"
    />
  );
};
