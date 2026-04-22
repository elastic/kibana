/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition } from '@kbn/es-mappings';
import type { IndexResourceDefinition } from './rule_doctor_findings';

export const RULE_DOCTOR_COVERAGE_STATE_INDEX = '.rule-doctor-coverage-state';
export const RULE_DOCTOR_COVERAGE_STATE_ILM_POLICY_NAME =
  '.rule-doctor-coverage-state-ilm-policy';
export const RULE_DOCTOR_COVERAGE_STATE_PIPELINE_NAME =
  '.rule-doctor-coverage-state-pipeline';

export const RULE_DOCTOR_COVERAGE_STATE_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {},
    },
    delete: {
      min_age: '90d',
      actions: {
        delete: {},
      },
    },
  },
};

export const ruleDoctorCoverageStateMappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    data_view_id: { type: 'keyword' },
    data_view_name: { type: 'keyword' },
    data_view_pattern: { type: 'keyword' },
    space_id: { type: 'keyword' },
    status: { type: 'keyword' },
    execution_id: { type: 'keyword' },
    feature_count: { type: 'integer' },
    feature_source: { type: 'keyword' },
    related_rule_count: { type: 'integer' },
    priority_score: { type: 'integer' },
    finding_count: { type: 'integer' },
    error: { type: 'text' },
  },
};

export type CoverageStateStatus = 'scheduled' | 'completed' | 'failed';

export interface CoverageStateDoc {
  '@timestamp': string;
  data_view_id: string;
  data_view_name: string;
  data_view_pattern: string;
  space_id: string;
  status: CoverageStateStatus;
  execution_id: string;
  feature_count?: number;
  feature_source?: string;
  related_rule_count?: number;
  priority_score?: number;
  finding_count?: number;
  error?: string;
}

export const getRuleDoctorCoverageStateResourceDefinition = (): IndexResourceDefinition => ({
  key: `index:${RULE_DOCTOR_COVERAGE_STATE_INDEX}`,
  indexName: RULE_DOCTOR_COVERAGE_STATE_INDEX,
  mappings: ruleDoctorCoverageStateMappings,
  ilmPolicy: {
    name: RULE_DOCTOR_COVERAGE_STATE_ILM_POLICY_NAME,
    policy: RULE_DOCTOR_COVERAGE_STATE_ILM_POLICY,
  },
  pipeline: {
    name: RULE_DOCTOR_COVERAGE_STATE_PIPELINE_NAME,
    processors: [
      {
        set: {
          field: '@timestamp',
          value: '{{{_ingest.timestamp}}}',
          override: false,
        },
      },
    ],
  },
});
