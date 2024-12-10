/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../common/lib/kibana';
import type { AlertActionsProps } from '../../../../types';

/**
 * Alerts table row action to open the selected alert detail page
 */
export const ViewAlertDetailsAlertAction = memo(
  ({
    alert,
    setFlyoutAlert,
    onActionExecuted,
    isAlertDetailsEnabled,
    resolveAlertPagePath,
    id: pageId,
  }: AlertActionsProps) => {
    const {
      http: {
        basePath: { prepend },
      },
    } = useKibana().services;
    const alertId = alert[ALERT_UUID]?.[0] ?? null;
    const pagePath = alertId && pageId && resolveAlertPagePath?.(alertId, pageId);
    const linkToAlert = pagePath ? prepend(pagePath) : null;

    if (isAlertDetailsEnabled && linkToAlert) {
      return (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          size="s"
          href={linkToAlert}
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
          setFlyoutAlert(alert._id);
        }}
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
          defaultMessage: 'View alert details',
        })}
      </EuiContextMenuItem>
    );
  }
);
