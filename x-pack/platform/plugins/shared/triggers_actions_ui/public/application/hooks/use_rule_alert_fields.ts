/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { ActionVariable } from '@kbn/alerting-plugin/common';
import { useEffect, useMemo, useState } from 'react';
/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import type { GetBrowserFieldsResponse } from '@kbn/alerting-types';
import {
  fetchRuleTypeAlertFields,
  getDescription,
} from '@kbn/alerts-ui-shared/src/common/apis/fetch_rule_type_alert_fields';

export function useRuleTypeAlertFields(
  http: HttpStart,
  ruleTypeId: string | undefined,
  enabled: boolean
): { isLoading: boolean; fields: ActionVariable[] } {
  // Reimplement useQuery here; this hook is sometimes called in contexts without a QueryClientProvider
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<GetBrowserFieldsResponse['fields']>([]);

  useEffect(() => {
    if (enabled && data.length === 0 && ruleTypeId) {
      setIsLoading(true);
      fetchRuleTypeAlertFields({ http, ruleTypeId }).then((res) => {
        setData(res);
        setIsLoading(false);
      });
    }
  }, [data, enabled, http, ruleTypeId]);

  return useMemo(
    () => ({
      isLoading,
      fields: data.map<ActionVariable>((d) => ({
        name: d.name,
        description: getDescription(d.name, EcsFlat),
      })),
    }),
    [data, isLoading]
  );
}
