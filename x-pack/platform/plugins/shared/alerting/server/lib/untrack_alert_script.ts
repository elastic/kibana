/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_END,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';

// Certain rule types don't flatten their AAD values, apply the ALERT_STATUS key to them directly
export const getUntrackUpdatePainlessScript = (now: Date) => `
if (!ctx._source.containsKey('${ALERT_STATUS}') || ctx._source['${ALERT_STATUS}'].empty) {
  ctx._source.${ALERT_STATUS} = '${ALERT_STATUS_UNTRACKED}';
  ctx._source.${ALERT_END} = '${now.toISOString()}';
  ctx._source.${ALERT_TIME_RANGE}.lte = '${now.toISOString()}';
} else {
  ctx._source['${ALERT_STATUS}'] = '${ALERT_STATUS_UNTRACKED}';
  ctx._source['${ALERT_END}'] = '${now.toISOString()}';
  ctx._source['${ALERT_TIME_RANGE}'].lte = '${now.toISOString()}';
}`;
