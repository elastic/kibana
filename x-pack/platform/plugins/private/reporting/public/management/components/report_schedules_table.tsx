/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, default as React, useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { EuiButton, logicalCSS, useEuiTheme } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { orderBy } from 'lodash';
import { stringify } from 'query-string';
import { REPORTING_REDIRECT_APP, buildKibanaPath } from '@kbn/reporting-common';
import type { ScheduledReportApiJSON, BaseParamsV2 } from '@kbn/reporting-common/types';
import { useKibana } from '@kbn/reporting-public';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  guessAppIconTypeFromObjectType,
  getDisplayNameFromObjectType,
  transformScheduledReport,
} from '../utils';
import { useGetScheduledList } from '../hooks/use_get_scheduled_list';
import { prettyPrintJobType } from '../../../common/job_utils';
import { ReportScheduleIndicator } from './report_schedule_indicator';
import { useBulkDisable } from '../hooks/use_bulk_disable';
import { NO_CREATED_REPORTS_DESCRIPTION } from '../../translations';
import { TruncatedTitle } from './truncated_title';
import { ReportDestructiveActionConfirmationModal } from './report_destructive_action_confirmation_modal';
import { useBulkDelete } from '../hooks/use_bulk_delete';
import { EditScheduledReportFlyout } from './edit_scheduled_report_flyout';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { ViewScheduledReportFlyout } from './view_scheduled_report_flyout';
import { useBulkEnable } from '../hooks/use_bulk_enable';

interface QueryParams {
  page: number;
  perPage: number;
  search: string;
}

export const ReportSchedulesTable = () => {
  const {
    application: { capabilities },
    http,
    userProfile: userProfileService,
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const { data: userProfile } = useGetUserProfileQuery({
    userProfileService,
  });

  const hasManageReportingPrivilege = useMemo(() => {
    if (!capabilities) {
      return false;
    }
    return capabilities.manageReporting.show === true;
  }, [capabilities]);

  const canManageSchedule = useCallback(
    (item: ScheduledReportApiJSON) => {
      if (hasManageReportingPrivilege) return true;

      return item.created_by === userProfile?.user.username;
    },
    [hasManageReportingPrivilege, userProfile?.user.username]
  );

  const [selectedReport, setSelectedReport] = useState<ScheduledReportApiJSON | null>(null);
  const [isConfigFlyOutOpen, setIsConfigFlyOutOpen] = useState<boolean>(false);
  const [isDisableModalConfirmationOpen, setIsDisableModalConfirmationOpen] =
    useState<boolean>(false);
  const [isDeleteModalConfirmationOpen, setIsDeleteModalConfirmationOpen] =
    useState<boolean>(false);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    perPage: 50,
    search: '',
  });
  const {
    data: scheduledList,
    isLoading,
    refetch: refreshScheduledReports,
  } = useGetScheduledList({
    ...queryParams,
  });

  const { mutateAsync: bulkDisableScheduledReports } = useBulkDisable();
  const { mutateAsync: bulkDeleteScheduledReports } = useBulkDelete();
  const { mutateAsync: bulkEnableScheduledReports } = useBulkEnable();

  const sortedList = orderBy(scheduledList?.data || [], ['created_at'], ['desc']);

  const tableColumns: Array<EuiBasicTableColumn<ScheduledReportApiJSON>> = [
    {
      field: 'payload.objectType',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.typeTitle', {
        defaultMessage: 'Type',
      }),
      width: '5%',
      render: (objectType: string) => (
        <EuiIconTip
          data-test-subj="reportObjectType"
          type={guessAppIconTypeFromObjectType(objectType)}
          size="s"
          content={getDisplayNameFromObjectType(objectType)}
        />
      ),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.reportTitle', {
        defaultMessage: 'Title',
      }),
      width: '22%',
      render: (title: string, item: ScheduledReportApiJSON) => (
        <EuiLink
          data-test-subj={`reportTitle`}
          onClick={() => {
            setReportAndOpenConfigFlyout(item);
          }}
        >
          <TruncatedTitle text={title} />
        </EuiLink>
      ),
      mobileOptions: {
        header: false,
        width: '100%',
      },
    },
    {
      field: 'status',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.statusTitle', {
        defaultMessage: 'Status',
      }),
      width: '10%',
      render: (_status: string, item: ScheduledReportApiJSON) => {
        return (
          <EuiHealth
            color={item.enabled ? 'primary' : 'subdued'}
            data-test-subj={`reportStatus-${item.enabled ? 'active' : 'disabled'}`}
          >
            {item.enabled
              ? i18n.translate('xpack.reporting.schedules.status.active', {
                  defaultMessage: 'Active',
                })
              : i18n.translate('xpack.reporting.schedules.status.disabled', {
                  defaultMessage: 'Disabled',
                })}
          </EuiHealth>
        );
      },
    },
    {
      field: 'schedule',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.scheduleTitle', {
        defaultMessage: 'Schedule',
      }),
      width: '10%',
      render: (schedule: ScheduledReportApiJSON['schedule']) => (
        <ReportScheduleIndicator schedule={schedule} />
      ),
    },
    {
      field: 'next_run',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.nextScheduleTitle', {
        defaultMessage: 'Next schedule',
      }),
      width: '20%',
      render: (nextRun: string, item) => {
        return item.enabled ? moment(nextRun).format('YYYY-MM-DD @ hh:mm A') : '—';
      },
    },
    {
      field: 'jobtype',
      width: '10%',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.fileType', {
        defaultMessage: 'File Type',
      }),
      render: (jobtype: string) => prettyPrintJobType(jobtype),
      mobileOptions: {
        show: false,
      },
    },
    {
      field: 'created_by',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.createdByTitle', {
        defaultMessage: 'Created by',
      }),
      width: '15%',
      render: (createdBy: string) => {
        return (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="baseline"
            data-test-subj="reportCreatedBy"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiAvatar name={createdBy} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiText size="s" className="eui-textTruncate">
                {createdBy}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'actions',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.actionsTitle', {
        defaultMessage: 'Actions',
      }),
      width: '8%',
      actions: [
        {
          name: i18n.translate('xpack.reporting.schedules.table.editConfig.title', {
            defaultMessage: 'Edit schedule config',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.editConfig.description', {
            defaultMessage: 'Edit schedule configuration details',
          }),
          'data-test-subj': (item) => `reportEditConfig-${item.id}`,
          type: 'icon',
          icon: 'calendar',
          available: (item) => canManageSchedule(item),
          onClick: (item) => setReportAndOpenConfigFlyout(item),
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.viewConfig.title', {
            defaultMessage: 'View schedule config',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.viewConfig.description', {
            defaultMessage: 'View schedule configuration details',
          }),
          'data-test-subj': (item) => `reportViewConfig-${item.id}`,
          type: 'icon',
          icon: 'calendar',
          available: (item) => !canManageSchedule(item),
          onClick: (item) => setReportAndOpenConfigFlyout(item),
        },
        {
          name: (item) =>
            i18n.translate('xpack.reporting.schedules.table.openDashboard.title', {
              defaultMessage: 'Open in {objectType}',
              values: {
                objectType: item.payload?.objectType
                  ? getDisplayNameFromObjectType(item.payload?.objectType)
                  : 'Kibana',
              },
            }),
          description: (item) =>
            i18n.translate('xpack.reporting.schedules.table.openDashboard.description', {
              defaultMessage: 'Open the Kibana app where this report was generated.',
            }),
          'data-test-subj': (item) => `reportOpenDashboard-${item.id}`,
          type: 'icon',
          icon: 'dashboardApp',
          available: (item) => Boolean((item.payload as BaseParamsV2)?.locatorParams),
          onClick: async (item) => {
            const searchParams = stringify({ scheduledReportId: item.id, ...queryParams });

            const path = buildKibanaPath({
              basePath: http.basePath.serverBasePath,
              spaceId: item.payload?.spaceId,
              appPath: REPORTING_REDIRECT_APP,
            });

            const href = `${path}?${searchParams}`;

            window.open(href, '_blank');
            window.focus();
          },
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.disableSchedule.title', {
            defaultMessage: 'Disable schedule',
          }),
          description: i18n.translate(
            'xpack.reporting.schedules.table.disableSchedule.description',
            {
              defaultMessage: 'Disable report schedule',
            }
          ),
          'data-test-subj': (item) => `reportDisableSchedule-${item.id}`,
          available: (item) => item.enabled && canManageSchedule(item),
          type: 'icon',
          icon: 'cross',
          onClick: (item) => setReportAndOpenDisableModal(item),
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.enableSchedule.title', {
            defaultMessage: 'Enable schedule',
          }),
          description: i18n.translate(
            'xpack.reporting.schedules.table.enableSchedule.description',
            {
              defaultMessage: 'Enable report schedule',
            }
          ),
          'data-test-subj': (item) => `reportEnableSchedule-${item.id}`,
          available: (item) => !item.enabled && canManageSchedule(item),
          type: 'icon',
          icon: 'check',
          onClick: (item) => {
            onEnable(item);
          },
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.deleteSchedule.title', {
            defaultMessage: 'Delete schedule',
          }),
          description: i18n.translate(
            'xpack.reporting.schedules.table.deleteSchedule.description',
            {
              defaultMessage: 'Delete report schedule',
            }
          ),
          available: (item) => canManageSchedule(item),
          'data-test-subj': (item) => `reportDeleteSchedule-${item.id}`,
          type: 'icon',
          icon: 'trash',
          onClick: (item) => setReportAndOpenDeleteModal(item),
        },
      ],
    },
  ];

  const setReportAndOpenConfigFlyout = useCallback(
    (report: ScheduledReportApiJSON) => {
      setSelectedReport(report);
      setIsConfigFlyOutOpen(true);
    },
    [setSelectedReport, setIsConfigFlyOutOpen]
  );

  const unSetReportAndCloseConfigFlyout = useCallback(() => {
    setSelectedReport(null);
    setIsConfigFlyOutOpen(false);
  }, [setSelectedReport, setIsConfigFlyOutOpen]);

  const setReportAndOpenDisableModal = useCallback(
    (report: ScheduledReportApiJSON) => {
      setSelectedReport(report);
      setIsDisableModalConfirmationOpen(true);
    },
    [setSelectedReport, setIsDisableModalConfirmationOpen]
  );

  const setReportAndOpenDeleteModal = useCallback(
    (report: ScheduledReportApiJSON) => {
      setSelectedReport(report);
      setIsDeleteModalConfirmationOpen(true);
    },
    [setSelectedReport]
  );

  const unSetReportAndCloseDisableModal = useCallback(() => {
    setSelectedReport(null);
    setIsDisableModalConfirmationOpen(false);
  }, [setSelectedReport, setIsDisableModalConfirmationOpen]);

  const unSetReportAndCloseDeleteModal = useCallback(() => {
    setSelectedReport(null);
    setIsDeleteModalConfirmationOpen(false);
  }, [setSelectedReport, setIsDeleteModalConfirmationOpen]);

  const onDisableConfirm = useCallback(() => {
    if (selectedReport) {
      bulkDisableScheduledReports({ ids: [selectedReport.id] });
    }
    unSetReportAndCloseDisableModal();
  }, [selectedReport, bulkDisableScheduledReports, unSetReportAndCloseDisableModal]);

  const onDeleteConfirm = useCallback(() => {
    if (selectedReport) {
      bulkDeleteScheduledReports({ ids: [selectedReport.id] });
    }
    unSetReportAndCloseDeleteModal();
  }, [selectedReport, unSetReportAndCloseDeleteModal, bulkDeleteScheduledReports]);

  const onEnable = useCallback(
    (item: ScheduledReportApiJSON) => {
      bulkEnableScheduledReports({ ids: [item.id] });
    },
    [bulkEnableScheduledReports]
  );

  const onCancelDestructiveAction = useCallback(
    () => unSetReportAndCloseDisableModal(),
    [unSetReportAndCloseDisableModal]
  );

  const tableOnChangeCallback = useCallback(
    (criteria: CriteriaWithPagination<ScheduledReportApiJSON>) => {
      const { index: page, size: perPage } = criteria.page;
      setQueryParams((prev) => ({
        ...prev,
        page: page + 1,
        perPage,
      }));
    },
    [setQueryParams]
  );

  const updateSearch = useCallback((searchText: string) => {
    setQueryParams((oldParams) => ({ ...oldParams, search: searchText, page: 1 }));
  }, []);

  const refresh = useCallback(() => {
    refreshScheduledReports();
  }, [refreshScheduledReports]);

  return (
    <Fragment>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          css={css`
            ${logicalCSS('padding-vertical', euiTheme.size.s)}
          `}
        >
          <EuiFlexItem grow>
            <EuiFieldSearch
              data-test-subj="scheduledReportsSearchField"
              fullWidth
              isClearable
              placeholder={i18n.translate(
                'xpack.reporting.schedules.table.searchPlaceholderTitle',
                {
                  defaultMessage: 'Search scheduled reports',
                }
              )}
              onSearch={updateSearch}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="refreshScheduledReportsButton"
              iconType="refresh"
              onClick={refresh}
              name="refresh"
              color="primary"
            >
              <FormattedMessage
                id="xpack.reporting.schedules.table.refreshScheduledReportsButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size={'s'} />
      <EuiFlexItem grow>
        <EuiBasicTable
          data-test-subj="reportSchedulesTable"
          items={sortedList}
          columns={tableColumns}
          loading={isLoading}
          pagination={{
            pageIndex: queryParams.page - 1,
            pageSize: queryParams.perPage,
            totalItemCount: scheduledList?.total ?? 0,
          }}
          noItemsMessage={NO_CREATED_REPORTS_DESCRIPTION}
          onChange={tableOnChangeCallback}
          rowProps={() => ({ 'data-test-subj': 'scheduledReportRow' })}
          tableCaption={i18n.translate(
            'xpack.reporting.schedules.table.reportSchedulesTableCaption',
            {
              defaultMessage: 'Report schedules table',
            }
          )}
        />
      </EuiFlexItem>
      {selectedReport &&
        isConfigFlyOutOpen &&
        (canManageSchedule(selectedReport) ? (
          <EditScheduledReportFlyout
            onClose={() => {
              unSetReportAndCloseConfigFlyout();
            }}
            scheduledReport={transformScheduledReport(selectedReport)}
            availableReportTypes={[
              {
                id: selectedReport.jobtype,
                label: prettyPrintJobType(selectedReport.jobtype),
              },
            ]}
          />
        ) : (
          <ViewScheduledReportFlyout
            onClose={() => {
              unSetReportAndCloseConfigFlyout();
            }}
            scheduledReport={transformScheduledReport(selectedReport)}
            availableReportTypes={[
              {
                id: selectedReport.jobtype,
                label: prettyPrintJobType(selectedReport.jobtype),
              },
            ]}
          />
        ))}
      {selectedReport && isDisableModalConfirmationOpen ? (
        <ReportDestructiveActionConfirmationModal
          title={i18n.translate('xpack.reporting.schedules.table.disableSchedule.modalTitle', {
            defaultMessage: 'Disable schedule',
          })}
          message={i18n.translate('xpack.reporting.schedules.table.disableSchedule.modalMessage', {
            defaultMessage: 'Disabling this schedule will stop the generation of future exports.',
          })}
          onCancel={onCancelDestructiveAction}
          onConfirm={onDisableConfirm}
          confirmButtonText={i18n.translate(
            'xpack.reporting.schedules.table.disableSchedule.modalConfirmButtonText',
            {
              defaultMessage: 'Disable',
            }
          )}
        />
      ) : null}
      {selectedReport && isDeleteModalConfirmationOpen ? (
        <ReportDestructiveActionConfirmationModal
          title={i18n.translate('xpack.reporting.schedules.table.deleteSchedule.modalTitle', {
            defaultMessage: 'Delete schedule',
          })}
          message={i18n.translate('xpack.reporting.schedules.table.deleteSchedule.modalMessage', {
            defaultMessage:
              'Deleting this schedule will stop the generation of future exports. You will not be able to recover this schedule.',
          })}
          onCancel={onCancelDestructiveAction}
          onConfirm={onDeleteConfirm}
          confirmButtonText={i18n.translate(
            'xpack.reporting.schedules.table.deleteSchedule.modalConfirmButtonText',
            {
              defaultMessage: 'Delete',
            }
          )}
        />
      ) : null}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportSchedulesTable as default };
