/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPagination,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { isDefined } from '@kbn/ml-is-defined';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import { useAlertsTableContext } from '@kbn/response-ops-alerts-table/contexts/alerts_table_context';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_CATEGORY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import {
  ALERT_FLYOUT_DEFAULT_TITLE,
  ALERT_FLYOUT_PAGINATION_ARIA_LABEL,
  getAlertFlyoutAriaLabel,
} from '@kbn/response-ops-alerts-table/translations';
import { getAlertFormatters } from './render_cell_value';

export const AlertsTableFlyout: GetAlertsTableProp<'renderExpandedAlertView'> = ({
  pageSize,
  pageIndex,
  expandedAlertIndex,
  onExpandedAlertIndexChange,
  alerts,
  alertsCount,
  isLoading,
  columns,
}) => {
  const {
    services: { fieldFormats },
  } = useAlertsTableContext();
  const formatter = getAlertFormatters(fieldFormats);
  const alertIndexInPage = expandedAlertIndex - pageIndex * pageSize;
  if (alertIndexInPage < 0 || alertIndexInPage >= alerts.length || pageSize <= 0) {
    onExpandedAlertIndexChange(null);
    return null;
  }
  const expandedAlertPage = Math.floor(expandedAlertIndex / pageSize);
  // This can be undefined when a new page of alerts is still loading
  const alert = alerts[alertIndexInPage] as Alert | undefined;

  const alertFlyoutAriaLabel =
    alert && alert[ALERT_RULE_CATEGORY]
      ? getAlertFlyoutAriaLabel(String(alert[ALERT_RULE_CATEGORY]))
      : ALERT_FLYOUT_DEFAULT_TITLE;

  return (
    <EuiFlyout
      onClose={() => {
        onExpandedAlertIndexChange?.(null);
      }}
      size="m"
      data-test-subj="alertFlyout"
      aria-label={alertFlyoutAriaLabel}
      ownFocus={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            {!isLoading && alert
              ? (alert[ALERT_RULE_NAME]?.[0] as string)
              : ALERT_FLYOUT_DEFAULT_TITLE}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={ALERT_FLYOUT_PAGINATION_ARIA_LABEL}
              pageCount={alertsCount}
              activePage={expandedAlertIndex}
              onPageClick={(activePage) => {
                onExpandedAlertIndexChange?.(activePage);
              }}
              compressed
              data-test-subj="alertFlyoutPagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      {isLoading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        alert &&
        expandedAlertPage === pageIndex && (
          <EuiPanel>
            <EuiDescriptionList
              listItems={columns.map((column) => {
                const alertFieldValue = get(alert, column.id);
                const value = (
                  Array.isArray(alertFieldValue) ? alertFieldValue.at(-1) : alertFieldValue
                ) as string;

                return {
                  title: column.displayAsText as string,
                  description: isDefined(value) ? formatter(column.id, value) : '—',
                };
              })}
              type="column"
              columnWidths={[1, 3]} // Same as [25, 75]
            />
          </EuiPanel>
        )
      )}
    </EuiFlyout>
  );
};
