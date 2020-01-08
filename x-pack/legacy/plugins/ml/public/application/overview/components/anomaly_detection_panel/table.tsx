/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  mlInMemoryTableFactory,
  SortDirection,
  SORT_DIRECTION,
  OnTableChangeArg,
  ColumnType,
} from '../../../components/ml_in_memory_table';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';
import { ExplorerLink } from './actions';
import { getJobsFromGroup } from './utils';
import { GroupsDictionary, Group } from './anomaly_detection_panel';
import { MlSummaryJobs } from '../../../../../common/types/jobs';
import { StatsBar, JobStatsBarStats } from '../../../components/stats_bar';
// @ts-ignore
import { JobSelectorBadge } from '../../../components/job_selector/job_selector_badge/index';
import { toLocaleString } from '../../../util/string_utils';
import { getSeverityColor } from '../../../../../common/util/anomaly_utils';

const MlInMemoryTable = mlInMemoryTableFactory<Group>();

// Used to pass on attribute names to table columns
export enum AnomalyDetectionListColumns {
  id = 'id',
  maxAnomalyScore = 'max_anomaly_score',
  jobIds = 'jobIds',
  latestTimestamp = 'latest_timestamp',
  docsProcessed = 'docs_processed',
  jobsInGroup = 'jobs_in_group',
}

interface Props {
  items: GroupsDictionary;
  statsBarData: JobStatsBarStats;
  jobsList: MlSummaryJobs;
}

export const AnomalyDetectionTable: FC<Props> = ({ items, jobsList, statsBarData }) => {
  const groupsList = Object.values(items);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(AnomalyDetectionListColumns.id);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  // columns: group, max anomaly, jobs in group, latest timestamp, docs processed, action to explorer
  const columns: Array<ColumnType<Group>> = [
    {
      field: AnomalyDetectionListColumns.id,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableId', {
        defaultMessage: 'Group ID',
      }),
      render: (id: Group['id']) => <JobSelectorBadge id={id} isGroup={id !== 'ungrouped'} />,
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      field: AnomalyDetectionListColumns.maxAnomalyScore,
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.ml.overview.anomalyDetection.tableMaxScoreTooltip', {
            defaultMessage:
              'Maximum score across all jobs in the group over its most recent 24 hour period',
          })}
        >
          <span>
            {i18n.translate('xpack.ml.overview.anomalyDetection.tableMaxScore', {
              defaultMessage: 'Max anomaly score',
            })}{' '}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      sortable: true,
      render: (score: Group['max_anomaly_score']) => {
        if (score === undefined) {
          // score is not loaded yet
          return <EuiLoadingSpinner />;
        } else if (score === null) {
          // an error occurred loading this group's score
          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.ml.overview.anomalyDetection.tableMaxScoreErrorTooltip',
                {
                  defaultMessage: 'There was a problem loading the maximum anomaly score',
                }
              )}
            >
              <EuiIcon type="alert" />
            </EuiToolTip>
          );
        } else if (score === 0) {
          return (
            // @ts-ignore
            <EuiHealth color={'transparent'} compressed="true">
              {score}
            </EuiHealth>
          );
        } else {
          const color: string = getSeverityColor(score);
          return (
            // @ts-ignore
            <EuiHealth color={color} compressed="true">
              {score >= 1 ? Math.floor(score) : '< 1'}
            </EuiHealth>
          );
        }
      },
      truncateText: true,
      width: '150px',
    },
    {
      field: AnomalyDetectionListColumns.jobsInGroup,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableNumJobs', {
        defaultMessage: 'Jobs in group',
      }),
      sortable: true,
      truncateText: true,
      width: '100px',
    },
    {
      field: AnomalyDetectionListColumns.latestTimestamp,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableLatestTimestamp', {
        defaultMessage: 'Latest timestamp',
      }),
      dataType: 'date',
      render: (time: number) => formatHumanReadableDateTimeSeconds(time),
      textOnly: true,
      truncateText: true,
      sortable: true,
      width: '20%',
    },
    {
      field: AnomalyDetectionListColumns.docsProcessed,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableDocsProcessed', {
        defaultMessage: 'Docs processed',
      }),
      render: (docs: number) => toLocaleString(docs),
      textOnly: true,
      sortable: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      render: (group: Group) => <ExplorerLink jobsList={getJobsFromGroup(group, jobsList)} />,
      width: '100px',
      align: 'right',
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
    totalItemCount: groupsList.length,
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
              {i18n.translate('xpack.ml.overview.anomalyDetection.panelTitle', {
                defaultMessage: 'Anomaly Detection',
              })}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="mlOverviewPanel__statsBar">
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
        items={groupsList}
        itemId={AnomalyDetectionListColumns.id}
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="mlOverviewTableAnomalyDetection"
      />
    </Fragment>
  );
};
