/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { buildRuleEventsEsqlQuery } from '../rule_events_esql_view';

const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

/**
 * Returns a callback that navigates to Discover pre-populated with the rule events query
 * filtered to the given rule ID, or `undefined` when the Discover locator is unavailable.
 * The button that triggers this should only be rendered when the return value is defined.
 */
export const useNavigateToRuleEventsInDiscover = (ruleId: string) => {
  const share = useService(PluginStart<SharePluginStart>('share'));
  const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);

  const navigate = useCallback(async () => {
    await locator?.navigate({
      query: { esql: buildRuleEventsEsqlQuery(ruleId) },
    });
  }, [locator, ruleId]);

  return locator ? navigate : undefined;
};
