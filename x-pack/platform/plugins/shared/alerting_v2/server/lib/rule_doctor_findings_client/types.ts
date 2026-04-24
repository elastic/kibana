/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleDoctorFindingDoc,
  RuleDoctorFindingStatus,
} from '../../resources/indices/rule_doctor_findings';

export interface ListFindingsParams {
  spaceId: string;
  status?: RuleDoctorFindingStatus;
  type?: string;
  executionId?: string;
  ruleIds?: string[];
  from?: number;
  size?: number;
}

export interface ListFindingsResult {
  items: RuleDoctorFindingDoc[];
  total: number;
}

export interface CountFindingsParams {
  spaceId: string;
  status?: RuleDoctorFindingStatus;
  type?: string;
}

export interface BulkIndexFindingsResult {
  indexed: number;
  failed: number;
}
