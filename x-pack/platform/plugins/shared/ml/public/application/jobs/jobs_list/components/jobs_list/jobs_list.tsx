/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { sortBy } from 'lodash';
import moment from 'moment';

import { TIME_FORMAT } from '@kbn/ml-date-utils';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { ANOMALY_DETECTOR_SAVED_OBJECT_TYPE } from '@kbn/ml-common-types/saved_objects';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  EuiToolTip,
  EuiBadge,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  type Direction,
  type EuiBasicTableColumn,
  type EuiBasicTableProps,
  type EuiTableActionsColumnType,
  type EuiTableSelectionType,
} from '@elastic/eui';
import type { AuditMessageBase } from '@kbn/ml-common-types/audit_message';

import { toLocaleString } from '../../../../util/string_utils';
import { JobIcon } from '../../../../components/job_message_icon';
import { useMlApi, useMlKibana } from '../../../../contexts/kibana';
import { ResultLinks, actionsMenuContent } from '../job_actions';
import { JobDescription } from './job_description';
import { isManagedJob, showCPSLegacyBadge } from '../../../jobs_utils';
import { MLSavedObjectsSpacesList } from '../../../../components/ml_saved_objects_spaces_list';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type MlSummaryJobWithSpaces = MlSummaryJob & {
  spaces?: string[];
};

interface TableChangeCriteria {
  page?: {
    index: number;
    size: number;
  };
  sort?: {
    field: keyof MlSummaryJobWithSpaces;
    direction: Direction;
  };
}

export interface JobsListProps {
  jobsSummaryList: MlSummaryJobWithSpaces[];
  fullJobsList: Record<string, CombinedJobWithStats>;
  isMlEnabledInSpace?: boolean;
  itemIdToExpandedRowMap: Record<string, ReactNode>;
  toggleRow: (jobId: string) => void;
  selectJobChange: EuiTableSelectionType<MlSummaryJobWithSpaces>['onSelectionChange'];
  showEditJobFlyout?: (job: MlSummaryJobWithSpaces) => void;
  showDatafeedChartFlyout?: (job: MlSummaryJobWithSpaces) => void;
  showDeleteJobModal?: (jobs: MlSummaryJobWithSpaces[]) => void;
  showStartDatafeedModal?: (jobs: MlSummaryJobWithSpaces[]) => void;
  showCloseJobsConfirmModal?: (jobs: MlSummaryJobWithSpaces[]) => void;
  showCreateAlertFlyout?: (jobIds: string[]) => void;
  showStopDatafeedsConfirmModal?: (jobs: MlSummaryJobWithSpaces[]) => void;
  showResetJobModal?: (jobs: MlSummaryJobWithSpaces[]) => void;
  refreshJobs?: () => void;
  selectedJobsCount: number;
  loading?: boolean;
  jobsViewState: ListingPageUrlState;
  onJobsViewStateUpdate: (update: Partial<ListingPageUrlState>) => void;
}

export const JobsList: FC<JobsListProps> = ({
  jobsSummaryList,
  itemIdToExpandedRowMap,
  toggleRow,
  selectJobChange,
  showEditJobFlyout,
  showDatafeedChartFlyout,
  showDeleteJobModal,
  showResetJobModal,
  showStartDatafeedModal,
  showCloseJobsConfirmModal,
  showStopDatafeedsConfirmModal,
  refreshJobs,
  showCreateAlertFlyout,
  selectedJobsCount,
  loading = false,
  jobsViewState,
  onJobsViewStateUpdate,
}) => {
  const {
    services: { spaces, application, notifications, share },
  } = useMlKibana();
  const mlApi = useMlApi();

  const { pageIndex, pageSize, sortField, sortDirection } = jobsViewState;

  const { pageOfItems, totalItemCount, correctedPageIndex } = useMemo(() => {
    const sortedList =
      sortDirection === 'asc'
        ? sortBy(jobsSummaryList, (item) => item[sortField as keyof MlSummaryJobWithSpaces])
        : sortBy(
            jobsSummaryList,
            (item) => item[sortField as keyof MlSummaryJobWithSpaces]
          ).reverse();
    const listLength = sortedList.length;

    let pageStart = pageIndex * pageSize;
    let nextPageIndex = pageIndex;
    if (pageStart >= listLength && listLength !== 0) {
      pageStart = Math.floor((listLength - 1) / pageSize) * pageSize;
      nextPageIndex = pageStart / pageSize;
    }

    return {
      pageOfItems: sortedList.slice(pageStart, pageStart + pageSize),
      totalItemCount: listLength,
      correctedPageIndex: nextPageIndex,
    };
  }, [jobsSummaryList, pageIndex, pageSize, sortDirection, sortField]);

  useEffect(() => {
    if (correctedPageIndex !== pageIndex) {
      onJobsViewStateUpdate({ pageIndex: correctedPageIndex });
    }
  }, [correctedPageIndex, pageIndex, onJobsViewStateUpdate]);

  const onTableChange = useCallback(
    (criteria: TableChangeCriteria) => {
      const { page, sort } = criteria;

      onJobsViewStateUpdate({
        pageIndex: page?.index ?? pageIndex,
        pageSize: page?.size ?? pageSize,
        sortField: (sort?.field as string) ?? sortField,
        sortDirection: sort?.direction ?? sortDirection,
      });
    },
    [onJobsViewStateUpdate, pageIndex, pageSize, sortDirection, sortField]
  );

  const onToggleRow = useCallback(
    (item: MlSummaryJobWithSpaces) => {
      toggleRow(item.id);
    },
    [toggleRow]
  );

  const renderJobId = useCallback((id: string, item: MlSummaryJobWithSpaces) => {
    const showManaged = isManagedJob(item);
    const showCpsLegacy = showCPSLegacyBadge(item);
    if (!showManaged && !showCpsLegacy) {
      return id;
    }

    return (
      <>
        <span>
          {id}
          {showManaged && (
            <>
              {' '}
              <EuiToolTip
                content={i18n.translate('xpack.ml.jobsList.managedBadgeTooltip', {
                  defaultMessage:
                    'This job is preconfigured and managed by Elastic; other parts of the product might have might have dependencies on its behavior.',
                })}
              >
                <EuiBadge tabIndex={0} color="hollow" data-test-subj="mlJobListRowManagedLabel">
                  {i18n.translate('xpack.ml.jobsList.managedBadgeLabel', {
                    defaultMessage: 'Managed',
                  })}
                </EuiBadge>
              </EuiToolTip>
            </>
          )}
          {showCpsLegacy && (
            <>
              {' '}
              <EuiToolTip
                content={i18n.translate('xpack.ml.jobsList.cpsLegacyBadgeTooltip', {
                  defaultMessage:
                    'This job is not using CPS project routing. Consider migrating the datafeed to use project routing.',
                })}
              >
                <EuiBadge tabIndex={0} color="hollow" data-test-subj="mlJobListRowCpsLegacyLabel">
                  {i18n.translate('xpack.ml.jobsList.cpsLegacyBadgeLabel', {
                    defaultMessage: 'Legacy',
                  })}
                </EuiBadge>
              </EuiToolTip>
            </>
          )}
        </span>
      </>
    );
  }, []);

  const columns = useMemo((): Array<EuiBasicTableColumn<MlSummaryJobWithSpaces>> => {
    const tableColumns: Array<EuiBasicTableColumn<MlSummaryJobWithSpaces>> = [
      {
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.showDetailsColumn.screenReaderDescription"
                defaultMessage="This column contains clickable controls for showing more details on each job"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        'data-test-subj': 'mlJobListColumnExpand',
        render: (item: MlSummaryJobWithSpaces) => (
          <EuiToolTip
            content={
              itemIdToExpandedRowMap[item.id]
                ? i18n.translate('xpack.ml.jobsList.collapseJobDetailsAriaLabel', {
                    defaultMessage: 'Hide details for {itemId}',
                    values: { itemId: item.id },
                  })
                : i18n.translate('xpack.ml.jobsList.expandJobDetailsAriaLabel', {
                    defaultMessage: 'Show details for {itemId}',
                    values: { itemId: item.id },
                  })
            }
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              onClick={() => onToggleRow(item)}
              iconType={
                itemIdToExpandedRowMap[item.id] ? 'chevronSingleDown' : 'chevronSingleRight'
              }
              aria-label={
                itemIdToExpandedRowMap[item.id]
                  ? i18n.translate('xpack.ml.jobsList.collapseJobDetailsAriaLabel', {
                      defaultMessage: 'Hide details for {itemId}',
                      values: { itemId: item.id },
                    })
                  : i18n.translate('xpack.ml.jobsList.expandJobDetailsAriaLabel', {
                      defaultMessage: 'Show details for {itemId}',
                      values: { itemId: item.id },
                    })
              }
              data-row-id={item.id}
              data-test-subj="mlJobListRowDetailsToggle"
            />
          </EuiToolTip>
        ),
        width: '3%',
      },
      {
        field: 'id',
        'data-test-subj': 'mlJobListColumnId',
        name: i18n.translate('xpack.ml.jobsList.idLabel', {
          defaultMessage: 'ID',
        }),
        sortable: true,
        truncateText: false,
        width: '15%',
        render: renderJobId,
      },
      {
        'data-test-subj': 'mlJobListColumnIcons',
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.iconsColumn.screenReaderDescription"
                defaultMessage="This column displays an alert icon when the job has alert rules, or a status icon when there are warnings or errors in the past 24 hours"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        width: '50px',
        render: (row: MlSummaryJobWithSpaces) => {
          const showAlertIcon = Array.isArray(row.alertingRules) && row.alertingRules.length > 0;
          const showAuditIcon = Boolean(row.auditMessage);
          if (!showAlertIcon && !showAuditIcon) {
            return null;
          }
          return (
            <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
              {showAlertIcon && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    position="bottom"
                    content={
                      <FormattedMessage
                        id="xpack.ml.jobsList.alertingRules.tooltipContent"
                        defaultMessage="Job has {rulesCount} associated alert {rulesCount, plural, one {rule} other {rules}}"
                        values={{ rulesCount: row.alertingRules?.length }}
                      />
                    }
                    type="bell"
                    data-test-subj="mlJobListAlertRulesIcon"
                  />
                </EuiFlexItem>
              )}
              {showAuditIcon && row.auditMessage !== undefined && (
                <EuiFlexItem grow={false}>
                  <JobIcon message={row.auditMessage as AuditMessageBase} showTooltip={true} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.ml.jobsList.descriptionLabel', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        field: 'description',
        'data-test-subj': 'mlJobListColumnDescription',
        render: (_description, item) => <JobDescription job={item} />,
        textOnly: true,
        width: '20%',
      },
      {
        field: 'processed_record_count',
        'data-test-subj': 'mlJobListColumnRecordCount',
        name: i18n.translate('xpack.ml.jobsList.processedRecordsLabel', {
          defaultMessage: 'Processed records',
        }),
        sortable: true,
        truncateText: false,
        dataType: 'number',
        render: (count: MlSummaryJobWithSpaces['processed_record_count']) => toLocaleString(count),
        width: '10%',
      },
      {
        field: 'memory_status',
        'data-test-subj': 'mlJobListColumnMemoryStatus',
        name: i18n.translate('xpack.ml.jobsList.memoryStatusLabel', {
          defaultMessage: 'Memory status',
        }),
        sortable: true,
        truncateText: false,
        width: '5%',
      },
      {
        field: 'jobState',
        'data-test-subj': 'mlJobListColumnJobState',
        name: i18n.translate('xpack.ml.jobsList.jobStateLabel', {
          defaultMessage: 'Job state',
        }),
        sortable: true,
        truncateText: false,
        width: '8%',
      },
      {
        field: 'datafeedState',
        'data-test-subj': 'mlJobListColumnDatafeedState',
        name: i18n.translate('xpack.ml.jobsList.datafeedStateLabel', {
          defaultMessage: 'Datafeed state',
        }),
        sortable: true,
        truncateText: false,
        width: '8%',
      },
      {
        name: i18n.translate('xpack.ml.jobsList.latestTimestampLabel', {
          defaultMessage: 'Latest timestamp',
        }),
        truncateText: false,
        field: 'latestTimestampSortValue',
        'data-test-subj': 'mlJobListColumnLatestTimestamp',
        sortable: true,
        render: (_time, item) =>
          item.latestTimestampMs === undefined
            ? ''
            : moment(item.latestTimestampMs).format(TIME_FORMAT),
        textOnly: true,
        width: '15%',
      },
    ];

    if (spaces) {
      tableColumns.push({
        name: i18n.translate('xpack.ml.jobsList.jobActionsColumn.spaces', {
          defaultMessage: 'Spaces',
        }),
        'data-test-subj': 'mlTableColumnSpaces',
        truncateText: true,
        align: 'right',
        width: '10%',
        render: (item: MlSummaryJobWithSpaces) => (
          <MLSavedObjectsSpacesList
            disabled={!application?.capabilities?.savedObjectsManagement?.shareIntoSpace}
            spacesApi={spaces}
            spaceIds={item.spaces}
            id={item.id}
            mlSavedObjectType={ANOMALY_DETECTOR_SAVED_OBJECT_TYPE}
            refresh={refreshJobs ?? (() => undefined)}
          />
        ),
      });
    }

    tableColumns.push(
      {
        name: (
          <EuiScreenReaderOnly>
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.jobActionsColumn.screenReaderDescription"
                defaultMessage="This column contains extra actions in a menu that can be performed on each job"
              />
            </p>
          </EuiScreenReaderOnly>
        ),
        render: (item: MlSummaryJobWithSpaces) => <ResultLinks jobs={[item]} />,
        width: '64px',
      },
      {
        name: i18n.translate('xpack.ml.jobsList.actionsLabel', {
          defaultMessage: 'Actions',
        }),
        actions: actionsMenuContent(
          notifications.toasts,
          share,
          mlApi,
          showEditJobFlyout,
          showDatafeedChartFlyout,
          showDeleteJobModal,
          showResetJobModal,
          showStartDatafeedModal,
          showCloseJobsConfirmModal,
          showStopDatafeedsConfirmModal,
          refreshJobs,
          showCreateAlertFlyout
        ) as unknown as EuiTableActionsColumnType<MlSummaryJobWithSpaces>['actions'],
        width: '5%',
      }
    );

    return tableColumns;
  }, [
    application?.capabilities?.savedObjectsManagement?.shareIntoSpace,
    itemIdToExpandedRowMap,
    mlApi,
    notifications.toasts,
    onToggleRow,
    refreshJobs,
    renderJobId,
    share,
    showCloseJobsConfirmModal,
    showCreateAlertFlyout,
    showDatafeedChartFlyout,
    showDeleteJobModal,
    showEditJobFlyout,
    showResetJobModal,
    showStartDatafeedModal,
    showStopDatafeedsConfirmModal,
    spaces,
  ]);

  const selectionControls = useMemo(
    (): EuiTableSelectionType<MlSummaryJobWithSpaces> => ({
      selectable: (job) => job.blocked === undefined,
      selectableMessage: (selectable, rowItem) =>
        selectable === false
          ? i18n.translate('xpack.ml.jobsList.cannotSelectRowForJobMessage', {
              defaultMessage: 'Cannot select job ID {jobId}',
              values: {
                jobId: rowItem.id,
              },
            })
          : i18n.translate('xpack.ml.jobsList.selectRowForJobMessage', {
              defaultMessage: 'Select the row for job ID {jobId}',
              values: {
                jobId: rowItem.id,
              },
            }),
      onSelectionChange: selectJobChange,
    }),
    [selectJobChange]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const sorting = useMemo(
    (): EuiBasicTableProps<MlSummaryJobWithSpaces>['sorting'] => ({
      sort: {
        field: sortField as keyof MlSummaryJobWithSpaces,
        direction: sortDirection as Direction,
      },
    }),
    [sortDirection, sortField]
  );

  const selectedJobsClass = selectedJobsCount ? 'jobs-selected' : '';

  return (
    <EuiBasicTable<MlSummaryJobWithSpaces>
      data-test-subj={loading ? 'mlJobListTable loading' : 'mlJobListTable loaded'}
      tableCaption={i18n.translate('xpack.ml.jobsList.tableCaption', {
        defaultMessage: 'List of anomaly detection jobs',
      })}
      loading={loading === true}
      noItemsMessage={
        loading
          ? i18n.translate('xpack.ml.jobsList.loadingJobsLabel', {
              defaultMessage: 'Loading jobs…',
            })
          : i18n.translate('xpack.ml.jobsList.noJobsFoundLabel', {
              defaultMessage: 'No jobs found',
            })
      }
      itemId="id"
      className={`jobs-list-table ${selectedJobsClass}`}
      items={pageOfItems}
      columns={columns}
      pagination={pagination}
      onChange={
        onTableChange as NonNullable<EuiBasicTableProps<MlSummaryJobWithSpaces>['onChange']>
      }
      selection={selectionControls}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      sorting={sorting}
      rowProps={(item) => ({
        'data-test-subj': `mlJobListRow row-${item.id}`,
      })}
      css={{ '.euiTableRow-isExpandedRow .euiTableCellContent': { animation: 'none' } }}
      rowHeader="id"
    />
  );
};
