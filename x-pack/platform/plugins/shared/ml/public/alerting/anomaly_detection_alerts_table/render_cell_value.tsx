/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React from 'react';
import { isDefined } from '@kbn/ml-is-defined';
import { ALERT_DURATION, ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { getFormattedSeverityScore, getSeverityColor } from '@kbn/ml-anomaly-utils';
import { EuiHealth } from '@elastic/eui';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Alert } from '@kbn/alerting-types';
import { useAlertsTableContext } from '@kbn/response-ops-alerts-table/contexts/alerts_table_context';
import {
  alertFieldNameMap,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
} from '../../../common/constants/alerts';
import { getFieldFormatterProvider } from '../../application/contexts/kibana/use_field_formatter';

const getAlertFieldValue = (alert: Alert, fieldName: string) => {
  // can be updated when working on https://github.com/elastic/kibana/issues/140819
  const rawValue = alert[fieldName];
  const value = Array.isArray(rawValue) ? rawValue.join() : rawValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return 'Error: Unable to parse JSON value.';
      }
    }
    return value;
  }

  return '--';
};

export const AlertsTableCellValue: GetAlertsTableProp<'renderCellValue'> = ({
  columnId,
  alert,
}) => {
  const {
    services: { fieldFormats },
  } = useAlertsTableContext();
  const alertValueFormatter = getAlertFormatters(fieldFormats);
  const value = getAlertFieldValue(alert, columnId);

  return alertValueFormatter(columnId, value);
};

export function getAlertFormatters(fieldFormats: FieldFormatsStart) {
  const getFormatter = getFieldFormatterProvider(fieldFormats);

  return (columnId: string, value: string | number | undefined) => {
    if (!isDefined(value)) return <>{'—'}</>;

    switch (columnId) {
      case ALERT_START:
      case ALERT_END:
      case ALERT_ANOMALY_TIMESTAMP:
        return <>{getFormatter(FIELD_FORMAT_IDS.DATE)(value)}</>;
      case ALERT_DURATION:
        return (
          <>
            {getFormatter(FIELD_FORMAT_IDS.DURATION, {
              inputFormat: 'microseconds',
              outputFormat: 'humanizePrecise',
            })(value)}
          </>
        );
      case ALERT_ANOMALY_SCORE:
        let latestValue: number;
        if (typeof value === 'number') {
          latestValue = value;
        } else {
          const resultValue: number[] = value.split(',').map(Number);
          latestValue = resultValue.at(-1) as number;
        }
        return (
          <EuiHealth textSize={'xs'} color={getSeverityColor(latestValue)}>
            {getFormattedSeverityScore(latestValue)}
          </EuiHealth>
        );
      default:
        return <>{value}</>;
    }
  };
}

export function getAlertEntryFormatter(fieldFormats: FieldFormatsRegistry) {
  const alertValueFormatter = getAlertFormatters(fieldFormats);

  return (columnId: string, value: any): { title: string; description: any } => {
    return {
      title: alertFieldNameMap[columnId],
      description: alertValueFormatter(columnId, value),
    };
  };
}
