/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { ScopedHistory } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useSetBreadcrumbs } from './breadcrumb_context';
import { MANAGEMENT_RULES_V1_TAB_PATH } from '../constants';

/**
 * Embeds the classic (v1) Rules management app under `/v1` using a scoped
 * sub-history so v1 routes (`/logs`, `/rule/:id`, `/create/...`) do not collide
 * with alerting v2 `/:ruleId`.
 */
export const V1RulesPage = () => {
  const history = useHistory() as ScopedHistory;
  const setBreadcrumbs = useSetBreadcrumbs();
  const triggersActionsUi = useService<TriggersAndActionsUIPublicPluginStart>(
    PluginStart('triggersActionsUi')
  );

  const subHistory = useMemo(
    () => history.createSubHistory(MANAGEMENT_RULES_V1_TAB_PATH),
    [history]
  );

  return triggersActionsUi.getRulesPage({
    history: subHistory,
    setBreadcrumbs,
  });
};
