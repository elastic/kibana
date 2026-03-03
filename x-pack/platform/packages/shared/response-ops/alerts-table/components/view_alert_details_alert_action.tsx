/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { typedMemo } from '../utils/react';

/**
 * Alerts table row action to open the selected alert detail page
 */
export const ViewAlertDetailsAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    rowIndex,
    onExpandedAlertIndexChange,
    onActionExecuted,
    isAlertDetailsEnabled,
    resolveAlertPagePath,
    alertDetailsNavigation,
    tableId,
    openLinksInNewTab,
  }: AlertActionsProps<AC>) => {
    const {
      services: {
        http: {
          basePath: { prepend },
        },
        application: { navigateToApp },
      },
    } = useAlertsTableContext();
    const alertId = (alert[ALERT_UUID]?.[0] as string) ?? null;
    const pagePath = alertId && tableId && resolveAlertPagePath?.(alertId, tableId);
    const linkToAlert = pagePath ? prepend(pagePath) : null;

    const handleNavigateToApp = useCallback(() => {
      if (alertDetailsNavigation && alertId) {
        onActionExecuted?.();
        navigateToApp(alertDetailsNavigation.appId, {
          path: alertDetailsNavigation.getPath(alertId),
          openInNewTab: openLinksInNewTab,
        });
      }
    }, [alertDetailsNavigation, alertId, onActionExecuted, navigateToApp, openLinksInNewTab]);

    if (alertDetailsNavigation && alertId) {
      return (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          size="s"
          onClick={handleNavigateToApp}
        >
          {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
            defaultMessage: 'View alert details',
          })}
        </EuiContextMenuItem>
      );
    }

    if (isAlertDetailsEnabled && linkToAlert) {
      return (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          size="s"
          href={linkToAlert}
          target={openLinksInNewTab ? '_blank' : undefined}
        >
          {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
            defaultMessage: 'View alert details',
          })}
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiContextMenuItem
        data-test-subj="viewAlertDetailsFlyout"
        key="viewAlertDetailsFlyout"
        size="s"
        onClick={() => {
          onActionExecuted?.();
          onExpandedAlertIndexChange(rowIndex);
        }}
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
          defaultMessage: 'View alert details',
        })}
      </EuiContextMenuItem>
    );
  }
);
