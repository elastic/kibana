/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, default as React, useCallback, useState } from 'react';
import {
  CriteriaWithPagination,
  EuiAvatar,
  EuiBasicTable,
  EuiBasicTableColumn,
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
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
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
import { ScheduledReportFlyout } from './scheduled_report_flyout';
import { TruncatedTitle } from './truncated_title';
import { DisableReportConfirmationModal } from './disable_report_confirmation_modal';

interface QueryParams {
  page: number;
  perPage: number;
}

export const ReportSchedulesTable = (props: { apiClient: ReportingAPIClient }) => {
  const { apiClient } = props;
  const { http } = useKibana().services;

  const [selectedReport, setSelectedReport] = useState<ScheduledReportApiJSON | null>(null);
  const [isConfigFlyOutOpen, setIsConfigFlyOutOpen] = useState<boolean>(false);
  const [isDisableModalConfirmationOpen, setIsDisableModalConfirmationOpen] =
    useState<boolean>(false);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    perPage: 50,
  });
  const { data: scheduledList, isLoading } = useGetScheduledList({
    ...queryParams,
  });

  const { mutateAsync: bulkDisableScheduledReports } = useBulkDisable();

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
          name: i18n.translate('xpack.reporting.schedules.table.viewConfig.title', {
            defaultMessage: 'View schedule config',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.viewConfig.description', {
            defaultMessage: 'View schedule configuration details',
          }),
          'data-test-subj': (item) => `reportViewConfig-${item.id}`,
          type: 'icon',
          icon: 'calendar',
          onClick: (item) => setReportAndOpenConfigFlyout(item),
        },
        {
          name: (item) =>
            i18n.translate('xpack.reporting.schedules.table.openDashboard.title', {
              defaultMessage: 'Open Dashboard',
            }),
          description: (item) =>
            i18n.translate('xpack.reporting.schedules.table.openDashboard.description', {
              defaultMessage: 'Open associated {objectType}',
              values: {
                objectType: item.payload?.objectType
                  ? getDisplayNameFromObjectType(item.payload?.objectType)
                  : '',
              },
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
          enabled: (item) => item.enabled,
          type: 'icon',
          icon: 'cross',
          onClick: (item) => setReportAndOpenDisableModal(item),
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

  const unSetReportAndCloseDisableModal = useCallback(() => {
    setSelectedReport(null);
    setIsDisableModalConfirmationOpen(false);
  }, [setSelectedReport, setIsDisableModalConfirmationOpen]);

  const onConfirm = useCallback(() => {
    if (selectedReport) {
      bulkDisableScheduledReports({ ids: [selectedReport.id] });
    }
    unSetReportAndCloseDisableModal();
  }, [selectedReport, bulkDisableScheduledReports, unSetReportAndCloseDisableModal]);

  const onCancel = useCallback(
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

  return (
    <Fragment>
      <EuiSpacer size={'l'} />
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
      />
      {selectedReport && isConfigFlyOutOpen && (
        <ScheduledReportFlyout
          apiClient={apiClient}
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
      )}
      {selectedReport && isDisableModalConfirmationOpen ? (
        <DisableReportConfirmationModal
          title={i18n.translate('xpack.reporting.schedules.table.disableSchedule.modalTitle', {
            defaultMessage: 'Disable schedule',
          })}
          message={i18n.translate('xpack.reporting.schedules.table.disableSchedule.modalMessage', {
            defaultMessage:
              'Disabling this schedule will stop the generation of future exports. You will not be able to enable this schedule again.',
          })}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportSchedulesTable as default };
