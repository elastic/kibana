/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import moment, { Duration } from 'moment';
import { padStart, chunk } from 'lodash';
import { EuiBasicTable, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AlertStatus,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { AlertStatusValues, MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { useBulkGetMaintenanceWindowsQuery } from '@kbn/response-ops-alerts-table/hooks/use_bulk_get_maintenance_windows';
import { MaintenanceWindowBaseCell } from '@kbn/response-ops-alerts-table/components/maintenance_windows_cell';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { Pagination } from '../../../../types';
import { AlertListItem } from './types';
import { AlertMutedSwitch } from './alert_muted_switch';
import { AlertLifecycleStatusBadge } from '../../../components/alert_lifecycle_status_badge';
import { useKibana } from '../../../../common';

export const getConvertedAlertStatus = (
  status: AlertStatusValues,
  alert: AlertListItem
): AlertStatus => {
  if (!alert.tracked) {
    return ALERT_STATUS_UNTRACKED;
  }
  if (status === 'Active') {
    return ALERT_STATUS_ACTIVE;
  }
  return ALERT_STATUS_RECOVERED;
};

const durationAsString = (duration: Duration): string => {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
};

interface RuleAlertListProps {
  items: AlertListItem[];
  readOnly: boolean;
  onMuteAction: (alert: AlertListItem) => Promise<void>;
}

const getRowProps = () => ({
  'data-test-subj': 'alert-row',
});

const getCellProps = () => ({
  'data-test-subj': 'cell',
});

function getPage<T>(items: T[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}

const isMaintenanceWindowValid = (mw: MaintenanceWindow | undefined): mw is MaintenanceWindow => {
  return !!mw;
};

interface RuleAlertListMaintenanceWindowCellProps {
  alert: AlertListItem;
  maintenanceWindows: Map<string, MaintenanceWindow>;
  isLoading: boolean;
}

const RuleAlertListMaintenanceWindowCell = (props: RuleAlertListMaintenanceWindowCellProps) => {
  const { alert, maintenanceWindows, isLoading } = props;

  const validMaintenanceWindows = useMemo(() => {
    const maintenanceWindowIds = alert.maintenanceWindowIds || [];
    return maintenanceWindowIds
      .map((id) => maintenanceWindows.get(id))
      .filter(isMaintenanceWindowValid);
  }, [alert, maintenanceWindows]);

  const idsWithoutMaintenanceWindow = useMemo(() => {
    const maintenanceWindowIds = alert.maintenanceWindowIds || [];
    return maintenanceWindowIds.filter((id) => !maintenanceWindows.get(id));
  }, [alert, maintenanceWindows]);

  return (
    <MaintenanceWindowBaseCell
      timestamp={alert.start?.toISOString()}
      maintenanceWindows={validMaintenanceWindows}
      maintenanceWindowIds={idsWithoutMaintenanceWindow}
      isLoading={isLoading}
    />
  );
};

export const RuleAlertList = (props: RuleAlertListProps) => {
  const { http, application, notifications, licensing } = useKibana().services;
  const { items, readOnly, onMuteAction } = props;

  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const pageOfAlerts = useMemo(
    () => getPage<AlertListItem>(items, pagination),
    [items, pagination]
  );

  const paginationOptions = useMemo(() => {
    return {
      pageIndex: pagination.index,
      pageSize: pagination.size,
      totalItemCount: items.length,
    };
  }, [pagination, items]);

  const maintenanceWindowIds = useMemo(() => {
    return new Set(
      pageOfAlerts.map((alert: AlertListItem) => alert.maintenanceWindowIds || []).flat()
    );
  }, [pageOfAlerts]);

  const { data: maintenanceWindows, isFetching: isLoadingMaintenanceWindows } =
    useBulkGetMaintenanceWindowsQuery({
      ids: Array.from(maintenanceWindowIds.values()),
      http,
      application,
      notifications,
      licensing,
    });

  const alertsTableColumns = useMemo(
    () => [
      {
        field: 'alert',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.Alert',
          {
            defaultMessage: 'Alert',
          }
        ),
        sortable: false,
        truncateText: true,
        width: '45%',
        'data-test-subj': 'alertsTableCell-alert',
        render: (value: string) => {
          return (
            <EuiToolTip anchorClassName={'eui-textTruncate'} content={value}>
              <span>{value}</span>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.status',
          {
            defaultMessage: 'Status',
          }
        ),
        width: '15%',
        render: (value: AlertStatusValues, alert: AlertListItem) => {
          const convertedStatus = getConvertedAlertStatus(value, alert);
          return (
            <AlertLifecycleStatusBadge alertStatus={convertedStatus} flapping={alert.flapping} />
          );
        },
        sortable: false,
        'data-test-subj': 'alertsTableCell-status',
      },
      {
        field: 'start',
        width: '190px',
        render: (value: Date | undefined) => {
          return value ? moment(value).format('D MMM YYYY @ HH:mm:ss') : '';
        },
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.start',
          {
            defaultMessage: 'Start',
          }
        ),
        sortable: false,
        'data-test-subj': 'alertsTableCell-start',
      },
      {
        field: 'duration',
        render: (value: number) => {
          return value ? durationAsString(moment.duration(value)) : '';
        },
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.duration',
          { defaultMessage: 'Duration' }
        ),
        sortable: false,
        width: '80px',
        'data-test-subj': 'alertsTableCell-duration',
      },
      {
        field: '',
        width: '250px',
        render: (alert: AlertListItem) => {
          return (
            <div>
              <RuleAlertListMaintenanceWindowCell
                alert={alert}
                maintenanceWindows={maintenanceWindows || new Map()}
                isLoading={isLoadingMaintenanceWindows}
              />
            </div>
          );
        },
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.maintenanceWindowIds',
          {
            defaultMessage: 'Maintenance windows',
          }
        ),
        sortable: false,
        'data-test-subj': 'alertsTableCell-maintenanceWindowIds',
      },
      {
        field: '',
        align: 'right' as const,
        width: '60px',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.columns.mute',
          {
            defaultMessage: 'Mute',
          }
        ),
        render: (alert: AlertListItem) => {
          return (
            <AlertMutedSwitch
              disabled={readOnly}
              onMuteAction={async () => await onMuteAction(alert)}
              alert={alert}
            />
          );
        },
        sortable: false,
        'data-test-subj': 'alertsTableCell-actions',
      },
    ],
    [maintenanceWindows, isLoadingMaintenanceWindows, onMuteAction, readOnly]
  );

  const onChange = useCallback(
    ({ page: changedPage }: { page: Pagination }) => {
      setPagination(changedPage);
    },
    [setPagination]
  );

  return (
    <EuiBasicTable<AlertListItem>
      items={pageOfAlerts}
      pagination={paginationOptions}
      onChange={onChange}
      rowProps={getRowProps}
      cellProps={getCellProps}
      columns={alertsTableColumns}
      data-test-subj="alertsList"
      tableLayout="fixed"
      className="alertsList"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertList as default };
