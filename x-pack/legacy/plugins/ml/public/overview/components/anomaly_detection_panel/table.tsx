/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MlInMemoryTable,
  SortDirection,
  SORT_DIRECTION,
  OnTableChangeArg,
} from '../../../components/ml_in_memory_table';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';
import { ExplorerLink } from './actions';
import { getJobsFromGroup } from './utils';
import { Group } from './anomaly_detection_panel';
import { StatsBar } from '../../../components/stats_bar';

// interface AnomalyDetectionListColumns {
//   id: string;
//   max_anomaly_score: number;
//   num_jobs: number;
//   latest_timestamp: number;
//   docs_processed: number;
// }

// Used to pass on attribute names to table columns
export enum AnomalyDetectionListColumns {
  id = 'id',
  maxAnomalyScore = 'max_anomaly_score',
  jobIds = 'jobIds',
  latestTimestamp = 'latest_timestamp',
  docsProcessed = 'docs_processed',
}

interface Props {
  items: Group[];
  statsBarData: any; // TODO: pull in from statsbar types
  jobsList: any;
}
export const AnomalyDetectionTable: FC<Props> = ({ items, jobsList, statsBarData }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(AnomalyDetectionListColumns.id);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  // columns: group, max anomaly, jobs in group, latest timestamp, docs processed, action to explorer
  const columns: any[] = [
    {
      field: AnomalyDetectionListColumns.id,
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.id', {
        defaultMessage: 'Group ID',
      }),
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      field: AnomalyDetectionListColumns.maxAnomalyScore,
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.maxScore', {
        defaultMessage: 'Max score',
      }),
      sortable: true,
      truncateText: true,
      width: '150px',
    },
    {
      field: AnomalyDetectionListColumns.jobIds,
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.numJobs', {
        defaultMessage: 'Jobs in group',
      }),
      render: (jobIds: Group['jobIds']) => jobIds.length,
      sortable: true,
      truncateText: true,
      width: '100px',
    },
    {
      field: AnomalyDetectionListColumns.latestTimestamp,
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.latestTimestamp', {
        defaultMessage: 'Latest timestamp',
      }),
      dataType: 'date',
      render: (time: number) => formatHumanReadableDateTimeSeconds(time),
      textOnly: true,
      sortable: true,
      width: '20%',
    },
    {
      field: AnomalyDetectionListColumns.docsProcessed,
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.docsProcessed', {
        defaultMessage: 'Docs processed',
      }),
      textOnly: true,
      sortable: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.anomalyDetectionList.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      render: (group: Group) => <ExplorerLink jobsList={getJobsFromGroup(group, jobsList)} />,
      width: '100px',
    },
  ];

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: AnomalyDetectionListColumns.id, direction: SORT_DIRECTION.ASC },
  }: OnTableChangeArg) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: items.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <Fragment>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <h3>
              {i18n.translate('xpack.ml.overview.anomalyDetectionPanelTitle', {
                defaultMessage: 'Anomaly Detection',
              })}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatsBar stats={statsBarData} dataTestSub={'mlOverviewJobStatsBar'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <MlInMemoryTable
        allowNeutralSort={false}
        className="mlAnomalyDetectionTable"
        columns={columns}
        hasActions={false}
        isExpandable={false}
        isSelectable={false}
        items={items}
        itemId={AnomalyDetectionListColumns.id}
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="mlOverviewTableAnomalyDetection"
      />
    </Fragment>
  );
};
