/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiProgress,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { SnapshotRecovery, SnapshotRecoveryShard } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';
import { formatDate } from '../../../../services/text';

interface Props {
  shards: SnapshotRecovery['shards'];
}

export const ShardsTable: React.FunctionComponent<Props> = ({ shards }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const Progress = ({
    total,
    recovered,
    percent,
  }: {
    total: number;
    recovered: number;
    percent: string;
  }) => (
    <EuiToolTip
      position="top"
      content={i18n.translate(
        'xpack.snapshotRestore.recoveryList.shardTable.progressTooltipLabel',
        {
          defaultMessage: '{recovered} of {total} restored',
          values: {
            recovered,
            total,
          },
        }
      )}
    >
      <EuiText size="xs" textAlign="center" style={{ width: '100%' }}>
        <EuiProgress value={total === 0 ? 1 : recovered} max={total === 0 ? 1 : total} size="xs" />
        <EuiSpacer size="xs" />
        {percent}
      </EuiText>
    </EuiToolTip>
  );

  const columns = [
    {
      field: 'id',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.indexColumnTitle', {
        defaultMessage: 'ID',
      }),
      width: '40px',
      render: (id: SnapshotRecoveryShard['id'], shard: SnapshotRecoveryShard) =>
        shard.primary ? (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>{id}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="right"
                content={
                  <FormattedMessage
                    id="xpack.snapshotRestore.recoveryList.shardTable.primaryTooltipLabel"
                    defaultMessage="Primary"
                  />
                }
              >
                <strong>
                  <FormattedMessage
                    id="xpack.snapshotRestore.recoveryList.shardTable.primaryAbbreviationText"
                    defaultMessage="P"
                  />
                </strong>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          id
        ),
    },
    {
      field: 'stage',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.stageColumnTitle', {
        defaultMessage: 'Stage',
      }),
    },
    {
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.startTimeColumnTitle', {
        defaultMessage: 'Start time',
      }),
      render: (startTimeInMillis: SnapshotRecoveryShard['startTimeInMillis']) =>
        startTimeInMillis ? formatDate(startTimeInMillis) : <EuiLoadingSpinner size="m" />,
    },
    {
      field: 'stopTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.endTimeColumnTitle', {
        defaultMessage: 'End time',
      }),
      render: (stopTimeInMillis: SnapshotRecoveryShard['stopTimeInMillis']) =>
        stopTimeInMillis ? formatDate(stopTimeInMillis) : <EuiLoadingSpinner size="m" />,
    },
    {
      field: 'totalTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      render: (totalTimeInMillis: SnapshotRecoveryShard['totalTimeInMillis']) =>
        totalTimeInMillis ? (
          <FormattedMessage
            id="xpack.snapshotRestore.recoveryList.shardTable.durationValue"
            defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
            values={{ seconds: Math.ceil(totalTimeInMillis / 1000) }}
          />
        ) : (
          <EuiLoadingSpinner size="m" />
        ),
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
    },
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
    },
    {
      field: 'version',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.versionColumnTitle', {
        defaultMessage: 'Version',
      }),
    },
    {
      field: 'targetHost',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.targetHostColumnTitle', {
        defaultMessage: 'Target host',
      }),
    },
    {
      field: 'targetNode',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.targetNodeColumnTitle', {
        defaultMessage: 'Target node',
      }),
    },
    {
      field: 'bytesTotal',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.bytesColumnTitle', {
        defaultMessage: 'Bytes',
      }),
      render: (
        bytesTotal: SnapshotRecoveryShard['bytesTotal'],
        { bytesRecovered, bytesPercent }: SnapshotRecoveryShard
      ) => <Progress total={bytesTotal} recovered={bytesRecovered} percent={bytesPercent} />,
    },
    {
      field: 'filesTotal',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.shardTable.filesColumnTitle', {
        defaultMessage: 'Files',
      }),
      render: (
        filesTotal: SnapshotRecoveryShard['filesTotal'],
        { filesRecovered, filesPercent }: SnapshotRecoveryShard
      ) => <Progress total={filesTotal} recovered={filesRecovered} percent={filesPercent} />,
    },
  ];

  return (
    <EuiBasicTable
      className="snapshotRestore__shardsTable"
      compressed={true}
      items={shards}
      columns={columns}
    />
  );
};
