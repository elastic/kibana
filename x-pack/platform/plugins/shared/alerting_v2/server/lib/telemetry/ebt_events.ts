/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RULE_CHANGED_EBT_EVENT_TYPE } from './rule_changed_event';
import { type RuleChangedEventData } from './rule_changed_event';

/** Maps every EBT event type the plugin registers to the data it is reported with. */
export interface AlertingEbtEventMap {
  [RULE_CHANGED_EBT_EVENT_TYPE]: RuleChangedEventData;
}

export type AlertingEbtEventType = keyof AlertingEbtEventMap;
