/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowDispatchedEbtData,
  WorkflowDispatchedEbtEventType,
} from '@kbn/alerting-v2-schemas';

/**
 * Maps every EBT event type the plugin registers to the data it is reported with.
 */
export type AlertingEbtEventMap = {
  [TEventType in WorkflowDispatchedEbtEventType]: WorkflowDispatchedEbtData;
};

export type AlertingEbtEventType = keyof AlertingEbtEventMap;
