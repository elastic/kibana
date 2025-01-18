/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { type TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { APP_ID as CASE_APP_ID, FEATURE_ID_V2 as CASE_GENERAL_ID } from '@kbn/cases-plugin/common';
import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';
import { getAlertFlyout } from './use_alerts_flyout';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
  ML_ALERT_TYPES,
} from '../../../common/constants/alerts';
import { getAlertFormatters, getRenderCellValue } from './render_cell_value';
import { AlertActions } from './alert_actions';

export function registerAlertsTableConfiguration(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  fieldFormats: FieldFormatsRegistry
) {
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

  const config: AlertsTableConfigurationRegistry = {
    id: ML_ALERTS_CONFIG_ID,
    cases: {
      appId: MANAGEMENT_APP_ID,
      featureId: CASE_GENERAL_ID,
      owner: [CASE_APP_ID],
      syncAlerts: false,
    },
    columns,
    useInternalFlyout: getAlertFlyout(columns, getAlertFormatters(fieldFormats)),
    getRenderCellValue,
    sort,
    useActionsColumn: () => ({
      renderCustomActionsRow: (props: RenderCustomActionsRowArgs) => {
        return <AlertActions {...props} />;
      },
    }),
    ruleTypeIds: [ML_ALERT_TYPES.ANOMALY_DETECTION],
  };

  triggersActionsUi.alertsTableConfigurationRegistry.register(config);
}

export const ML_ALERTS_CONFIG_ID = 'mlAlerts';
