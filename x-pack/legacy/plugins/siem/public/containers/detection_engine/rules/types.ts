/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface Rule {
  id: string;
  name: string;
  alertTypeId: string;
  alertTypeParams: RuleAlertTypeParams;
  interval: string;
  enabled: true;
  actions: RuleAction[];
  throttle: null;
  createdBy: string;
  updatedBy: string;
  apiKeyOwner: string;
  muteAll: false;
  mutedInstanceIds: [];
  scheduledTaskId: string;
}

export interface RuleAlertTypeParams {
  description: string;
  id: string;
  index: string[];
  from: string;
  filter: string | null;
  query: string;
  language: string;
  savedId: string | null;
  filters: string | null;
  maxSignals: number;
  severity: string;
  to: string;
  type: string;
  references: string[];
}

export interface RuleAction {
  group: string;
  params: {
    message: string;
    level: string;
  };
  id: string;
}
