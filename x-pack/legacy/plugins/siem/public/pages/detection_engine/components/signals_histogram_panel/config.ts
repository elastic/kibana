/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalsHistogramOption } from './types';

export const signalsHistogramOptions: SignalsHistogramOption[] = [
  { text: 'signal.rule.risk_score', value: 'signal.rule.risk_score' },
  { text: 'signal.rule.severity', value: 'signal.rule.severity' },
  { text: 'signal.rule.threat.tactic.name', value: 'signal.rule.threat.tactic.name' },
  { text: 'destination.ip', value: 'destination.ip' },
  { text: 'event.action', value: 'event.action' },
  { text: 'event.category', value: 'event.category' },
  { text: 'host.name', value: 'host.name' },
  { text: 'signal.rule.type', value: 'signal.rule.type' },
  { text: 'signal.rule.name', value: 'signal.rule.name' },
  { text: 'source.ip', value: 'source.ip' },
  { text: 'user.name', value: 'user.name' },
];
