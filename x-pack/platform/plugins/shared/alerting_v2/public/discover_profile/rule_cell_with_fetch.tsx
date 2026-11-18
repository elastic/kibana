/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  EpisodeRuleCell,
  type EpisodeRuleCellProps,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { useFetchRule } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule';

export interface EpisodeRuleCellWithFetchProps
  extends Omit<EpisodeRuleCellProps, 'rulesCache' | 'isLoadingRules'> {
  http: HttpStart;
}

/**
 * Renders the episode rule cell for hosts without a table-level rules cache, fetching the
 * rule of its own row. Rows share the request through the react-query cache.
 */
export const EpisodeRuleCellWithFetch = ({ http, ...props }: EpisodeRuleCellWithFetchProps) => {
  const { row, columnId } = props;
  const ruleId = row.flattened[columnId] as string | undefined;
  const { data: rule, isInitialLoading } = useFetchRule({ id: ruleId, http });

  const rulesCache = useMemo(() => (ruleId && rule ? { [ruleId]: rule } : {}), [ruleId, rule]);

  return <EpisodeRuleCell {...props} rulesCache={rulesCache} isLoadingRules={isInitialLoading} />;
};
