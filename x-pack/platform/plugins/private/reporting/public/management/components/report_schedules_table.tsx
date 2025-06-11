/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, default as React } from 'react';
import {
  Criteria,
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

import { ScheduledReport } from '@kbn/reporting-common/types';
import moment from 'moment';
import { ListingPropsInternal } from '..';
import { guessAppIconTypeFromObjectType, getDisplayNameFromObjectType } from '../utils';
import { useGetScheduledListQuery } from '../hooks/use_get_scheduled_list_query';
import { prettyPrintJobType } from '../../../common/job_utils';
import { ReportScheduleIndicator } from './report_schedule_indicator';
import { useBulkDisableQuery } from '../hooks/use_bulk_disable_query';

export const ReportSchedulesTable = (props: ListingPropsInternal) => {
  const { http, toasts } = props;
  const { data: scheduledList, isLoading } = useGetScheduledListQuery({ http });
  const { mutateAsync: bulkDisableScheduledReports } = useBulkDisableQuery({ http, toasts });

  const tableColumns: Array<EuiBasicTableColumn<ScheduledReport>> = [
    {
      field: 'objectType',
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
      width: '20%',
      render: (title: string, item: ScheduledReport) => (
        <EuiLink data-test-subj={`reportTitle`} onClick={() => {}}>
          {title}
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
      render: (status: string, item: ScheduledReport) => {
        return (
          <EuiHealth
            color={item.enabled ? 'primary' : 'subdued'}
            data-test-subj={`reprotStatus-${item.enabled ? 'active' : 'disabled'}`}
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
      width: '15%',
      render: (schedule: ScheduledReport['schedule']) => (
        <ReportScheduleIndicator schedule={schedule} />
      ),
    },
    {
      field: 'nextRun',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.nextScheduleTitle', {
        defaultMessage: 'Next schedule',
      }),
      width: '20%',
      render: (nextRun: string) => {
        return moment(nextRun).format('YYYY-MM-DD @ hh:mm A');
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
      field: 'createdBy',
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
              <EuiAvatar name={createdBy} />
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
      width: '5%',
      actions: [
        {
          name: i18n.translate('xpack.reporting.schedules.table.viewConfig.title', {
            defaultMessage: 'View schedule config',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.viewConfig.description', {
            defaultMessage: 'View schedule configuration details',
          }),
          'data-test-subj': 'reportViewConfig',
          type: 'icon',
          icon: 'calendar',
          onClick: () => {},
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.openDashboard.title', {
            defaultMessage: 'Open Dashboard',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.openDashboard.description', {
            defaultMessage: 'Open associated dashboard',
          }),
          'data-test-subj': 'reportOpenDashboard',
          type: 'icon',
          icon: 'dashboardApp',

          onClick: (item) => {
            // const searchParams = stringify({ id: item.id });
            // const path = buildKibanaPath({
            //   basePath: http.basePath.serverBasePath,
            //   // spaceId: .spaceId,
            //   appPath: REPORTING_REDIRECT_APP,
            // });
            // const href = `${path}?${searchParams}`;
            // window.open(href, '_blank');
            // window.focus();
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
          'data-test-subj': 'reportDisableSchedule',
          enabled: (item) => item.enabled,
          type: 'icon',
          icon: 'cross',
          onClick: (item) => {
            bulkDisableScheduledReports({ ids: [item.id] });
          },
        },
      ],
    },
  ];

  return (
    <Fragment>
      <EuiSpacer size={'l'} />
      <EuiBasicTable
        data-test-subj="reportSchedulesTable"
        items={scheduledList?.data || []}
        columns={tableColumns}
        loading={isLoading}
        pagination={{
          pageIndex: scheduledList?.page || 0,
          pageSize: scheduledList?.perPage || 10,
          totalItemCount: scheduledList?.total || 0,
          showPerPageOptions: true,
        }}
        onChange={(criteria: Criteria<ScheduledReport>) => {}}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportSchedulesTable as default };
