/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const findingsMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    result: {
      properties: {
        evaluation: { type: 'keyword' },
        evidence: { type: 'object', enabled: false },
      },
    },
    rule: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
        remediation: { type: 'text' },
        benchmark: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text' },
            version: { type: 'keyword' },
            posture_type: { type: 'keyword' },
            rule_number: { type: 'keyword' },
          },
        },
        section: { type: 'keyword' },
        level: { type: 'integer' },
        frameworks: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            version: { type: 'keyword' },
            control: { type: 'keyword' },
          },
        },
        tags: { type: 'keyword' },
      },
    },
    host: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        os: {
          properties: {
            family: { type: 'keyword' },
            name: { type: 'keyword' },
            version: { type: 'keyword' },
            platform: { type: 'keyword' },
          },
        },
      },
    },
    agent: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
        version: { type: 'keyword' },
      },
    },
    resource: {
      properties: {
        type: { type: 'keyword' },
        sub_type: { type: 'keyword' },
      },
    },
    data_stream: {
      properties: {
        dataset: { type: 'keyword' },
        namespace: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
  },
};
