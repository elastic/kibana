/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkLocations, Capabilities } from '@kbn/core/public';
import { RULES_CAPABILITY_ID } from './common/constants';

const RULES_APP_VISIBLE_IN: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];

/**
 * The top-level `rules` application is a thin redirect into the Rules management page. Unlike the
 * management link, its nav link capability (`navLinks.rules`) is not owned by any Kibana feature, so
 * it stays enabled for every user and would otherwise surface Rules in global search (and the
 * solution side nav) even for users without rules access — e.g. `stackAlertsOnly`, which grants the
 * Alerts management link but not the Rules one.
 *
 * Gate the app's visibility on the same management capability that gates the Rules management link
 * (`management.insightsAndAlerting.triggersActionsRules`) so global search honors the Alerts/Rules
 * decoupling. See https://github.com/elastic/kibana/issues/276520.
 */
export const getRulesAppVisibleIn = (capabilities: Capabilities): AppDeepLinkLocations[] => {
  const hasRulesAccess = Boolean(
    capabilities.management?.insightsAndAlerting?.[RULES_CAPABILITY_ID]
  );
  return hasRulesAccess ? RULES_APP_VISIBLE_IN : [];
};
