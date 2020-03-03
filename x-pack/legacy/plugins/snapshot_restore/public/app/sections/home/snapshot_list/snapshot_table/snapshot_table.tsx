/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiLink,
  Query,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';

import { SnapshotDetails } from '../../../../../../common/types';
import { SNAPSHOT_STATE, UIM_SNAPSHOT_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { linkToRepository, linkToRestoreSnapshot } from '../../../../services/navigation';
import { uiMetricService } from '../../../../services/ui_metric';
import { DataPlaceholder, FormattedDateTime, SnapshotDeleteProvider } from '../../../../components';
import { SendRequestResponse } from '../../../../../shared_imports';

interface Props {
  snapshots: SnapshotDetails[];
  repositories: string[];
  reload: () => Promise<SendRequestResponse>;
  openSnapshotDetailsUrl: (repositoryName: string, snapshotId: string) => string;
  repositoryFilter?: string;
  policyFilter?: string;
  onSnapshotDeleted: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void;
}

const getLastSuccessfulManagedSnapshot = (
  snapshots: SnapshotDetails[]
): SnapshotDetails | undefined => {
  const successfulSnapshots = snapshots
    .filter(
      ({ state, repository, managedRepository }) =>
        repository === managedRepository && state === 'SUCCESS'
    )
    .sort((a, b) => {
      return +new Date(b.endTime) - +new Date(a.endTime);
    });

  return successfulSnapshots[0];
};

export const SnapshotTable: React.FunctionComponent<Props> = ({
  snapshots,
  repositories,
  reload,
  openSnapshotDetailsUrl,
  onSnapshotDeleted,
  repositoryFilter,
  policyFilter,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;
  const [selectedItems, setSelectedItems] = useState<SnapshotDetails[]>([]);

  const lastSuccessfulManagedSnapshot = getLastSuccessfulManagedSnapshot(snapshots);

  const columns = [
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
      truncateText: true,
      sortable: true,
      render: (snapshotId: string, snapshot: SnapshotDetails) => (
        /* eslint-disable-next-line @elastic/eui/href-or-on-click */
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
    {
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startTimeInMillis: number) => (
        <DataPlaceholder data={startTimeInMillis}>
          <FormattedDateTime epochMs={startTimeInMillis} />
        </DataPlaceholder>
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
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ snapshot, repository, state }: SnapshotDetails) => {
            const canRestore = state === SNAPSHOT_STATE.SUCCESS || state === SNAPSHOT_STATE.PARTIAL;
            const label = canRestore
              ? i18n.translate('xpack.snapshotRestore.snapshotList.table.actionRestoreTooltip', {
                  defaultMessage: 'Restore',
                })
              : state === SNAPSHOT_STATE.IN_PROGRESS
              ? i18n.translate(
                  'xpack.snapshotRestore.snapshotList.table.actionRestoreDisabledInProgressTooltip',
                  {
                    defaultMessage: `Can't restore in-progress snapshot`,
                  }
                )
              : i18n.translate(
                  'xpack.snapshotRestore.snapshotList.table.actionRestoreDisabledInvalidTooltip',
                  {
                    defaultMessage: `Can't restore invalid snapshot`,
                  }
                );
            return (
              <EuiToolTip content={label}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.snapshotRestore.snapshotList.table.actionRestoreAriaLabel',
                    {
                      defaultMessage: 'Store snapshot `{name}`',
                      values: { name: snapshot },
                    }
                  )}
                  iconType="importAction"
                  color="primary"
                  data-test-subj="srsnapshotListRestoreActionButton"
                  href={linkToRestoreSnapshot(repository, snapshot)}
                  isDisabled={!canRestore}
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: ({ snapshot, repository }: SnapshotDetails) => {
            return (
              <SnapshotDeleteProvider>
                {deleteSnapshotPrompt => {
                  const isDeleteDisabled = Boolean(lastSuccessfulManagedSnapshot)
                    ? snapshot === lastSuccessfulManagedSnapshot!.snapshot
                    : false;
                  const label = isDeleteDisabled
                    ? i18n.translate(
                        'xpack.snapshotRestore.snapshotList.table.deleteManagedRepositorySnapshotTooltip',
                        {
                          defaultMessage:
                            'You must store the last successful snapshot in a managed repository.',
                        }
                      )
                    : i18n.translate(
                        'xpack.snapshotRestore.snapshotList.table.actionDeleteTooltip',
                        { defaultMessage: 'Delete' }
                      );
                  return (
                    <EuiToolTip content={label}>
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.snapshotList.table.actionDeleteAriaLabel',
                          {
                            defaultMessage: `Delete snapshot '{name}'`,
                            values: { name: snapshot },
                          }
                        )}
                        iconType="trash"
                        color="danger"
                        data-test-subj="srsnapshotListDeleteActionButton"
                        onClick={() =>
                          deleteSnapshotPrompt([{ snapshot, repository }], onSnapshotDeleted)
                        }
                        isDisabled={isDeleteDisabled}
                      />
                    </EuiToolTip>
                  );
                }}
              </SnapshotDeleteProvider>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  // By default, we'll display the most recent snapshots at the top of the table.
  const sorting = {
    sort: {
      field: 'startTimeInMillis',
      direction: 'desc' as const,
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
      policyName: {
        type: 'string',
      },
    },
  };

  const selection = {
    onSelectionChange: (newSelectedItems: SnapshotDetails[]) => setSelectedItems(newSelectedItems),
    selectable: ({ snapshot }: SnapshotDetails) =>
      Boolean(lastSuccessfulManagedSnapshot)
        ? snapshot !== lastSuccessfulManagedSnapshot!.snapshot
        : true,
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.snapshotRestore.snapshotList.table.deleteManagedRepositorySnapshotDescription',
          {
            defaultMessage: 'You must retain the last successful snapshot in a managed repository.',
          }
        );
      }
    },
  };

  const search = {
    toolsLeft: selectedItems.length ? (
      <SnapshotDeleteProvider>
        {(
          deleteSnapshotPrompt: (
            ids: Array<{ snapshot: string; repository: string }>,
            onSuccess?: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void
          ) => void
        ) => {
          return (
            <EuiButton
              onClick={() =>
                deleteSnapshotPrompt(
                  selectedItems.map(({ snapshot, repository }) => ({ snapshot, repository })),
                  onSnapshotDeleted
                )
              }
              color="danger"
              data-test-subj="srSnapshotListBulkDeleteActionButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.table.deleteSnapshotButton"
                defaultMessage="Delete {count, plural, one {snapshot} other {snapshots}}"
                values={{
                  count: selectedItems.length,
                }}
              />
            </EuiButton>
          );
        }}
      </SnapshotDeleteProvider>
    ) : (
      undefined
    ),
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
        type: 'field_value_selection' as const,
        field: 'repository',
        name: i18n.translate('xpack.snapshotRestore.snapshotList.table.repositoryFilterLabel', {
          defaultMessage: 'Repository',
        }),
        multiSelect: false,
        options: repositories.map(repository => ({
          value: repository,
          view: repository,
        })),
      },
    ],
    defaultQuery: policyFilter
      ? Query.parse(`policyName="${policyFilter}"`, {
          schema: {
            ...searchSchema,
            strict: true,
          },
        })
      : repositoryFilter
      ? Query.parse(`repository="${repositoryFilter}"`, {
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
      itemId="uuid"
      columns={columns}
      search={search}
      sorting={sorting}
      isSelectable={true}
      selection={selection}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="snapshotTable"
    />
  );
};
