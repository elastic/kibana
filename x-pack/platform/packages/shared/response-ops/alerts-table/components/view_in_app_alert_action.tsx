/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { defaultAlertFormatterFormatters } from '@kbn/alerts-ui-shared/src/common/formatters';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { typedMemo } from '../utils/react';

/**
 * Alerts table row action to open the alert in its originating application.
 * Uses the rule type's formatter to generate a deep link URL.
 */
export const ViewInAppAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    getAlertFormatter,
    openLinksInNewTab,
  }: AlertActionsProps<AC>) => {
    const {
      services: {
        http: {
          basePath: { prepend },
        },
      },
    } = useAlertsTableContext();

    const formattedAlert = useMemo(() => {
      const ruleTypeId = alert[ALERT_RULE_TYPE_ID]?.[0] as string | undefined;
      if (!ruleTypeId || !getAlertFormatter) {
        return null;
      }

      const formatter = getAlertFormatter(ruleTypeId);
      if (!formatter) {
        return null;
      }

      try {
        // Convert the alert to a plain object with fields
        const fields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(alert)) {
          // Alert fields are typically arrays, extract first value for simpler access
          fields[key] = Array.isArray(value) ? value[0] : value;
        }

        return formatter({
          fields,
          formatters: defaultAlertFormatterFormatters,
        });
      } catch (error) {
        // If formatting fails, don't show the action
        return null;
      }
    }, [alert, getAlertFormatter]);

    if (!formattedAlert?.link) {
      return null;
    }

    const href = formattedAlert.hasBasePath ? formattedAlert.link : prepend(formattedAlert.link);

    return (
      <EuiContextMenuItem
        data-test-subj="viewInAppAlertAction"
        key="viewInApp"
        href={href}
        target={openLinksInNewTab ? '_blank' : undefined}
        size="s"
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewInApp', {
          defaultMessage: 'View in app',
        })}
      </EuiContextMenuItem>
    );
  }
);
