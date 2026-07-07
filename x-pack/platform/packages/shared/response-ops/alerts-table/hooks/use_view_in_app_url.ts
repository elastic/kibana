/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';
import { defaultAlertFormatterFormatters } from '@kbn/alerts-ui-shared';
import type { AlertFormatter } from '@kbn/alerts-ui-shared';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

/**
 * Computes a "View in app" deep-link URL for an alert by calling the rule type's formatter.
 * Returns the final href (with base path prepended when needed), or null if no link can be resolved.
 */
export const useViewInAppUrl = (
  alert: Alert,
  getAlertFormatter: ((ruleTypeId: string) => AlertFormatter | undefined) | undefined
): string | null => {
  const {
    services: {
      http: {
        basePath: { prepend },
      },
    },
  } = useAlertsTableContext();

  return useMemo(() => {
    const ruleTypeId = alert[ALERT_RULE_TYPE_ID]?.[0] as string | undefined;
    if (!ruleTypeId || !getAlertFormatter) {
      return null;
    }

    const formatter = getAlertFormatter(ruleTypeId);
    if (!formatter) {
      return null;
    }

    try {
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(alert)) {
        fields[key] = Array.isArray(value) ? value[0] : value;
      }

      const formattedAlert = formatter({
        fields,
        formatters: defaultAlertFormatterFormatters,
      });

      if (!formattedAlert?.link) {
        return null;
      }

      return formattedAlert.hasBasePath ? formattedAlert.link : prepend(formattedAlert.link);
    } catch {
      return null;
    }
  }, [alert, getAlertFormatter, prepend]);
};
