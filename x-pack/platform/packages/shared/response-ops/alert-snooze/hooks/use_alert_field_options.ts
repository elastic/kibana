/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { useFetchAlertsFieldsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_alerts_fields_query';
import { toLeafScalarFieldOptions } from '../utils/alert_field_options';

export interface UseAlertFieldOptionsParams {
  http: HttpStart;
  ruleTypeIds: string[];
  enabled?: boolean;
}

export interface UseAlertFieldOptionsResult {
  fieldOptions: Array<EuiComboBoxOptionOption<string>>;
  isLoading: boolean;
}

/**
 * Fetches the alert index fields for the given rule type ids and exposes them
 * as searchable `EuiComboBox` options limited to leaf-level scalar fields (the
 * only paths the `field_change` snooze condition can reliably snapshot).
 */
export const useAlertFieldOptions = ({
  http,
  ruleTypeIds,
  enabled = true,
}: UseAlertFieldOptionsParams): UseAlertFieldOptionsResult => {
  const { data, isLoading } = useFetchAlertsFieldsQuery(
    { http, ruleTypeIds },
    { enabled: enabled && ruleTypeIds.length > 0 }
  );

  const fieldOptions = useMemo(() => toLeafScalarFieldOptions(data?.fields ?? []), [data?.fields]);

  return { fieldOptions, isLoading };
};
