/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertActionAppliedEbtData, AlertActionEbtEventType } from './alert_action_ebt_schema';
import type { RuleChangedEbtData, RuleEbtEventType } from './rule_ebt_schema';

/**
 * Maps every EBT event type the plugin registers to the data it is reported with.
 * Rule-lifecycle events share {@link RuleChangedEbtData}. Alert-action events share
 * {@link AlertActionAppliedEbtData}.
 */
export type AlertingEbtEventMap = {
  [TEventType in RuleEbtEventType]: RuleChangedEbtData;
} & {
  [TEventType in AlertActionEbtEventType]: AlertActionAppliedEbtData;
};

export type AlertingEbtEventType = keyof AlertingEbtEventMap;
