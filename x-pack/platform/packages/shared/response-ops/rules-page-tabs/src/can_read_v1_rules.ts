/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';

/** Capability id from `triggers_actions_ui`'s `RULES_CAPABILITY_ID` (`public/common/constants`). */
const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID = 'triggersActionsRules';

/**
 * Returns whether the current user can read the v1 Rules page, so the Alerting v2 heading's
 * v1 tab is only shown when it wouldn't just navigate to a privileges wall.
 */
export const canReadV1Rules = (capabilities: Capabilities): boolean => {
  return Boolean(
    capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]
  );
};
