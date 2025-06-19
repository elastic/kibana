/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, default as React, useCallback, useState } from 'react';
import {
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
import { Frequency } from '@kbn/rrule';
import moment from 'moment';
import { stringify } from 'query-string';
import { REPORTING_REDIRECT_APP, buildKibanaPath } from '@kbn/reporting-common';
import type { ScheduledReportApiJSON, BaseParamsV2 } from '@kbn/reporting-common/types';
import {
  RecurrenceFrequency,
  RecurringSchedule,
} from '@kbn/response-ops-recurring-schedule-form/types';
import { RecurrenceEnd } from '@kbn/response-ops-recurring-schedule-form/constants';
import type { Rrule } from '@kbn/task-manager-plugin/server/task';
import { ListingPropsInternal } from '..';
import { guessAppIconTypeFromObjectType, getDisplayNameFromObjectType } from '../utils';
import { useGetScheduledList } from '../hooks/use_get_scheduled_list';
import { prettyPrintJobType } from '../../../common/job_utils';
import { ReportScheduleIndicator } from './report_schedule_indicator';
import { useBulkDisable } from '../hooks/use_bulk_disable';
import { NO_CREATED_REPORTS_DESCRIPTION } from '../../translations';
import { ScheduledReportFlyout } from './scheduled_report_flyout';
import { ScheduledReport } from '../../types';
import { TruncatedTitle } from './truncated_title';

interface QueryParams {
  index: number;
  size: number;
}

export const ReportSchedulesTable = (props: ListingPropsInternal) => {
  const { http, toasts } = props;
  const [selectedReport, setSelectedReport] = useState<ScheduledReportApiJSON | null>(null);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    index: 1,
    size: 10,
  });
  const { data: scheduledList, isLoading } = useGetScheduledList({
    http,
    ...queryParams,
  });

  const { mutateAsync: bulkDisableScheduledReports } = useBulkDisable({
    http,
    toasts,
  });

  const tableColumns: Array<EuiBasicTableColumn<ScheduledReportApiJSON>> = [
    {
      field: 'payload.objectType',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.typeTitle', {
        defaultMessage: 'Type',
      }),
      width: '5%',
      render: (_objectType: string) => (
        <EuiIconTip
          data-test-subj="reportObjectType"
          type={guessAppIconTypeFromObjectType(_objectType)}
          size="s"
          content={getDisplayNameFromObjectType(_objectType)}
        />
      ),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.reportTitle', {
        defaultMessage: 'Title',
      }),
      width: '20%',
      render: (_title: string, item: ScheduledReportApiJSON) => (
        <EuiLink data-test-subj={`reportTitle`} onClick={() => setSelectedReport(item)}>
          <TruncatedTitle text={_title} />
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
      render: (_schedule: ScheduledReportApiJSON['schedule']) => (
        <ReportScheduleIndicator schedule={_schedule} />
      ),
    },
    {
      field: 'next_run',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.nextScheduleTitle', {
        defaultMessage: 'Next schedule',
      }),
      width: '20%',
      render: (_nextRun: string) => {
        return moment(_nextRun).format('YYYY-MM-DD @ hh:mm A');
      },
    },
    {
      field: 'jobtype',
      width: '10%',
      name: i18n.translate('xpack.reporting.schedules.tableColumns.fileType', {
        defaultMessage: 'File Type',
      }),
      render: (_jobtype: string) => prettyPrintJobType(_jobtype),
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
      render: (_createdBy: string) => {
        return (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="baseline"
            data-test-subj="reportCreatedBy"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiAvatar name={_createdBy} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiText size="s" className="eui-textTruncate">
                {_createdBy}
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
          'data-test-subj': (item) => `reportViewConfig-${item.id}`,
          type: 'icon',
          icon: 'calendar',
          onClick: (item) => {
            setSelectedReport(item);
          },
        },
        {
          name: i18n.translate('xpack.reporting.schedules.table.openDashboard.title', {
            defaultMessage: 'Open Dashboard',
          }),
          description: i18n.translate('xpack.reporting.schedules.table.openDashboard.description', {
            defaultMessage: 'Open associated dashboard',
          }),
          'data-test-subj': (item) => `reportOpenDashboard-${item.id}`,
          type: 'icon',
          icon: 'dashboardApp',
          available: (item) => Boolean((item.payload as BaseParamsV2)?.locatorParams),
          onClick: async (item) => {
            const searchParams = stringify({ scheduledReportId: item.id });

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
          onClick: (item) => {
            bulkDisableScheduledReports({ ids: [item.id] });
          },
        },
      ],
    },
  ];

  const tableOnChangeCallback = useCallback(
    ({ page }: { page: QueryParams }) => {
      setQueryParams((prev) => ({
        ...prev,
        index: page.index + 1,
        size: page.size,
      }));
    },
    [setQueryParams]
  );

  const isCustom = (rRule: Rrule) => {
    const freq = rRule.freq;
    // interval is greater than 1
    if (rRule.interval && rRule.interval > 1) {
      return true;
    }
    // frequency is daily and no weekdays are selected
    if (freq && freq === Frequency.DAILY && !rRule.byweekday) {
      return true;
    }
    // frequency is weekly and there are multiple weekdays selected
    if (freq && freq === Frequency.WEEKLY && rRule.byweekday && rRule.byweekday.length > 1) {
      return true;
    }
    // frequency is monthly and by month day is selected
    if (freq && freq === Frequency.MONTHLY && rRule.bymonthday) {
      return true;
    }
    return false;
  };

  const transformedReport = (report: ScheduledReportApiJSON): ScheduledReport => {
    const { title, schedule, notification } = report;
    const rRule = schedule.rrule;

    const isCustomFrequency = isCustom(rRule);
    const frequency = rRule.freq as RecurrenceFrequency;

    const recurringSchedule: RecurringSchedule = {
      frequency: isCustomFrequency ? 'CUSTOM' : frequency,
      interval: rRule.interval,
      ends: RecurrenceEnd.NEVER,
    };

    if (isCustomFrequency) {
      recurringSchedule.customFrequency = frequency;
    }

    if (frequency !== Frequency.MONTHLY && rRule.byweekday) {
      recurringSchedule.byweekday = rRule.byweekday.reduce<Record<string, boolean>>((acc, day) => {
        acc[day] = true;
        return acc;
      }, {});
    }
    if (frequency === Frequency.MONTHLY) {
      if (rRule.byweekday) {
        recurringSchedule.bymonth = 'weekday';
      } else if (rRule.bymonthday) {
        recurringSchedule.bymonth = 'day';
      }
    }

    return {
      title,
      recurringSchedule,
      reportTypeId: report.jobtype as ScheduledReport['reportTypeId'],
      timezone: schedule.rrule.tzid,
      startDate: '',
      recurring: true,
      sendByEmail: Boolean(notification?.email),
      emailRecipients: [...(notification?.email?.to || [])],
    };
  };

  return (
    <Fragment>
      <EuiSpacer size={'l'} />
      <EuiBasicTable
        data-test-subj="reportSchedulesTable"
        items={scheduledList?.data || []}
        columns={tableColumns}
        loading={isLoading}
        pagination={{
          pageIndex: queryParams.index - 1,
          pageSize: queryParams.size,
          totalItemCount: scheduledList?.total ?? 0,
        }}
        noItemsMessage={NO_CREATED_REPORTS_DESCRIPTION}
        onChange={tableOnChangeCallback}
        rowProps={() => ({ 'data-test-subj': 'scheduledReportRow' })}
      />
      {selectedReport && (
        <ScheduledReportFlyout
          apiClient={props.apiClient}
          onClose={() => {
            setSelectedReport(null);
          }}
          scheduledReport={transformedReport(selectedReport)}
          availableReportTypes={[
            {
              id: selectedReport.jobtype,
              label: prettyPrintJobType(selectedReport.jobtype),
            },
          ]}
        />
      )}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportSchedulesTable as default };
