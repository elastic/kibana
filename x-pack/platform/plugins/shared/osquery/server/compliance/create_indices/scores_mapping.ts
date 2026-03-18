/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const scoresMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    score: { type: 'float' },
    total_findings: { type: 'integer' },
    passed_findings: { type: 'integer' },
    failed_findings: { type: 'integer' },
    not_applicable_findings: { type: 'integer' },
    rule: {
      properties: {
        benchmark: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text' },
            version: { type: 'keyword' },
          },
        },
      },
    },
    policy_template: { type: 'keyword' },
    host_count: { type: 'integer' },
    is_enabled_rules_score: { type: 'boolean' },
    namespace: { type: 'keyword' },
  },
};
