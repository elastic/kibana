/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { isAlertingV2Enabled, hasAlertingV2RulesReadCapability } from '@kbn/alerting-v2-utils';

/**
 * Returns whether the Alerting v2 Rules tab should be shown on the v1 Rules page:
 * the advanced-setting gate ({@link isAlertingV2Enabled}) plus read (or write) access to
 * Alerting v2 rules, so the tab never points at a privileges wall.
 */
export const shouldShowAlertingV2RulesTab = (core: CoreStart): boolean => {
  return isAlertingV2Enabled(core) && hasAlertingV2RulesReadCapability(core);
};
