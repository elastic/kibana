/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleDoctorInsightDoc,
  RuleDoctorInsightStatus,
} from '../../resources/indices/rule_doctor_insights';

export interface ListInsightsParams {
  spaceId: string;
  status?: RuleDoctorInsightStatus;
  type?: string;
  executionId?: string;
  ruleIds?: string[];
  from?: number;
  size?: number;
}

export interface ListInsightsResult {
  items: RuleDoctorInsightDoc[];
  total: number;
}

export interface BulkIndexInsightsResult {
  indexed: number;
  failed: number;
}
