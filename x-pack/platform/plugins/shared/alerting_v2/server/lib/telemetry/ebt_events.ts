/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangedEventData, RuleEbtEventType } from './rule_changed_event';

/**
 * Maps every EBT event type the plugin registers to the data it is reported with.
 * Rule-lifecycle events share {@link RuleChangedEventData}.
 */
export type AlertingEbtEventMap = {
  [TEventType in RuleEbtEventType]: RuleChangedEventData;
};

export type AlertingEbtEventType = keyof AlertingEbtEventMap;
