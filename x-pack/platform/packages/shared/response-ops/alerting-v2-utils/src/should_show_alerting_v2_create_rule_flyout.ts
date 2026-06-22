/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { isAlertingV2Enabled } from './is_alerting_v2_enabled';

export interface ShouldShowAlertingV2CreateRuleFlyoutParams {
  isEsqlMode: boolean;
  isPluginAvailable: boolean;
}

/**
 * Returns whether Discover should expose the Alerting v2 create-rule flyout
 * instead of the legacy v1 alerts popover menu.
 *
 * Callers pass runtime context (ES|QL mode, plugin availability); the advanced
 * setting gate is centralized in {@link isAlertingV2Enabled}.
 */
export const shouldShowAlertingV2CreateRuleFlyout = (
  core: CoreStart,
  { isEsqlMode, isPluginAvailable }: ShouldShowAlertingV2CreateRuleFlyoutParams
): boolean => {
  return isEsqlMode && isPluginAvailable && isAlertingV2Enabled(core);
};
