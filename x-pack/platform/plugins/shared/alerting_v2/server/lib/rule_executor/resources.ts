/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IlmPolicy,
} from '@elastic/elasticsearch/lib/api/types';

// TODO ILM for new rules should be managed by the user
export const DEFAULT_ALERTS_ILM_POLICY_NAME = '.alerts-v2-ilm-policy';
export const DEFAULT_ALERTS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

const ALERTS_WRITTEN_FIELDS_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    // Timestamp when the alert event is written to the index
    '@timestamp': { type: 'date' },
    // Timestamp when the rule is scheduled to be evaluated
    scheduled_timestamp: { type: 'date' },
    rule: {
      properties: {
        id: { type: 'keyword' },
        tags: { type: 'keyword' },
      },
    },
    grouping: {
      properties: {
        key: { type: 'keyword' },
        value: { type: 'keyword' },
      },
    },
    data: { type: 'flattened' },
    parent_rule_id: { type: 'keyword' },
    status: { type: 'keyword' },
    alert_id: { type: 'keyword' },
    alert_series_id: { type: 'keyword' },
    source: { type: 'keyword' },
    tags: { type: 'keyword' },
  },
};

export const alertsWrittenFieldsMappings = ALERTS_WRITTEN_FIELDS_MAPPINGS;

export interface AlertsResourcesTemplates {
  componentTemplate: ClusterPutComponentTemplateRequest;
  indexTemplate: IndicesPutIndexTemplateRequest;
}
