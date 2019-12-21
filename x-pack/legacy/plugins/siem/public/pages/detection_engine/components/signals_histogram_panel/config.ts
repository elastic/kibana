/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import { SignalsHistogramOption } from './types';

// TODO: Add additional query for IP Range Aggregation to enable stacking by Source/Dest IP
// See: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-iprange-aggregation.html
export const signalsHistogramOptions: SignalsHistogramOption[] = [
  { text: i18n.STACK_BY_RISK_SCORES, value: 'signal.rule.risk_score' },
  { text: i18n.STACK_BY_SEVERITIES, value: 'signal.rule.severity' },
  // { text: i18n.STACK_BY_DESTINATION_IPS, value: 'destination.ip' },
  { text: i18n.STACK_BY_ACTIONS, value: 'event.action' },
  { text: i18n.STACK_BY_CATEGORIES, value: 'event.category' },
  { text: i18n.STACK_BY_HOST_NAMES, value: 'host.name' },
  { text: i18n.STACK_BY_RULE_TYPES, value: 'signal.rule.type' },
  { text: i18n.STACK_BY_RULE_NAMES, value: 'signal.rule.name' },
  // { text: i18n.STACK_BY_SOURCE_IPS, value: 'source.ip' },
  { text: i18n.STACK_BY_USERS, value: 'user.name' },
];
