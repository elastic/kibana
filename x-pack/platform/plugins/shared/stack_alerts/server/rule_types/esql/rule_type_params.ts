/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import type { AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';

export interface ESQLRuleState extends RuleTypeState {
  latestTimestamp: string | undefined;
}

export type ESQLAlertState = AlertState;
