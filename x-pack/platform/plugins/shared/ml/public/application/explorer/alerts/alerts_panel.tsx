/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiLoadingSpinner,
  type EuiDataGridColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  type AlertStatus,
} from '@kbn/rule-data-utils';
import useObservable from 'react-use/lib/useObservable';
import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';
import { APP_ID as CASE_APP_ID, FEATURE_ID as CASE_GENERAL_ID } from '@kbn/cases-plugin/common';
import type { SortCombinations, SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { ML_RULE_TYPE_IDS } from '../../../../common';
import { ML_VALID_CONSUMERS } from '../../../../common/constants/alerts';
import { AlertActions } from '../../../alerting/anomaly_detection_alerts_table/alert_actions';
import { AlertsTableFlyoutBody } from '../../../alerting/anomaly_detection_alerts_table/flyout_body';
import { CollapsiblePanel } from '../../components/collapsible_panel';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { AlertsSummary } from './alerts_summary';
import { AnomalyDetectionAlertsOverviewChart } from './chart';
import { statusNameMap } from './const';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
} from '../../../../common/constants/alerts';
import { AlertsTableCellValue } from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';

const columns: EuiDataGridColumn[] = [
  {
    id: ALERT_STATUS,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.status', {
      defaultMessage: 'Status',
    }),
    initialWidth: 150,
  },
  {
    id: ALERT_REASON,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.reason', {
      defaultMessage: 'Reason',
    }),
    initialWidth: 150,
  },
  {
    id: ALERT_RULE_NAME,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.ruleName', {
      defaultMessage: 'Rule name',
    }),
    initialWidth: 150,
  },
  {
    id: ALERT_ANOMALY_DETECTION_JOB_ID,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.jobId', {
      defaultMessage: 'Job ID',
    }),
    initialWidth: 150,
  },
  {
    id: ALERT_ANOMALY_SCORE,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.anomalyScore', {
      defaultMessage: 'Latest anomaly score',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: ALERT_START,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.triggeredAt', {
      defaultMessage: 'Triggered at',
    }),
    initialWidth: 250,
    schema: 'datetime',
  },
  {
    id: ALERT_END,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.recoveredAt', {
      defaultMessage: 'Recovered at',
    }),
    initialWidth: 250,
    schema: 'datetime',
  },
  {
    id: ALERT_ANOMALY_TIMESTAMP,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.anomalyTime', {
      defaultMessage: 'Latest anomaly time',
    }),
    initialWidth: 250,
    schema: 'datetime',
  },
  {
    id: ALERT_DURATION,
    displayAsText: i18n.translate('xpack.ml.alertsTable.columns.duration', {
      defaultMessage: 'Duration',
    }),
    initialWidth: 150,
    schema: 'numeric',
  },
];

const sort: SortCombinations[] = [
  {
    [ALERT_START]: {
      order: 'desc' as SortOrder,
    },
  },
];

export const AlertsPanel: FC = () => {
  const { data, http, notifications, fieldFormats, application, licensing, settings } =
    useMlKibana().services;

  const [isOpen, setIsOpen] = useState(true);
  const [toggleSelected, setToggleSelected] = useState(`alertsSummary`);
  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);
  const alertsQuery = useObservable(anomalyDetectionAlertsStateService.alertsQuery$, {});
  const isLoading = useObservable(anomalyDetectionAlertsStateService.isLoading$, true);

  const toggleButtons = [
    {
      id: `alertsSummary`,
      label: i18n.translate('xpack.ml.explorer.alertsPanel.summaryLabel', {
        defaultMessage: 'Summary',
      }),
    },
    {
      id: `alertsTable`,
      label: i18n.translate('xpack.ml.explorer.alertsPanel.detailsLabel', {
        defaultMessage: 'Details',
      }),
    },
  ];

  return (
    <>
      <CollapsiblePanel
        isOpen={isOpen}
        onToggle={setIsOpen}
        header={
          <EuiFlexGroup alignItems={'center'} gutterSize={'xs'}>
            <EuiFlexItem grow={false}>
              <FormattedMessage id="xpack.ml.explorer.alertsPanel.header" defaultMessage="Alerts" />
            </EuiFlexItem>
            {isLoading ? (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size={'m'} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
        headerItems={Object.entries(countByStatus ?? {}).map(([status, count]) => {
          return (
            <>
              {statusNameMap[status as AlertStatus]}{' '}
              <EuiNotificationBadge
                size="m"
                color={status === ALERT_STATUS_ACTIVE ? 'accent' : 'subdued'}
              >
                {count}
              </EuiNotificationBadge>
            </>
          );
        })}
        ariaLabel={i18n.translate('xpack.ml.explorer.alertsPanel.ariaLabel', {
          defaultMessage: 'alerts panel',
        })}
      >
        <AnomalyDetectionAlertsOverviewChart />

        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate('xpack.ml.explorer.alertsPanel.summaryTableToggle', {
            defaultMessage: 'Summary / Table view toggle',
          })}
          options={toggleButtons}
          idSelected={toggleSelected}
          onChange={setToggleSelected}
        />
        <EuiSpacer size="m" />

        {toggleSelected === 'alertsTable' ? (
          <AlertsTable
            id={`ml-details-alerts`}
            ruleTypeIds={ML_RULE_TYPE_IDS}
            consumers={ML_VALID_CONSUMERS}
            query={alertsQuery}
            columns={columns}
            initialSort={sort}
            renderCellValue={AlertsTableCellValue}
            renderFlyoutBody={AlertsTableFlyoutBody}
            renderActionsCell={AlertActions}
            casesConfiguration={{
              appId: MANAGEMENT_APP_ID,
              featureId: CASE_GENERAL_ID,
              owner: [CASE_APP_ID],
              syncAlerts: false,
            }}
            showAlertStatusWithFlapping
            services={{
              data,
              http,
              notifications,
              fieldFormats,
              application,
              licensing,
              settings,
            }}
          />
        ) : (
          <AlertsSummary />
        )}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
