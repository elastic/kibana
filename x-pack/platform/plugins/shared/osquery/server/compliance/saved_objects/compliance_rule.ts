/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';

export const complianceRuleType: SavedObjectsType = {
  name: COMPLIANCE_RULE_SO_TYPE,
  indexPattern: '.kibana_security_solution',
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      rule_id: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      query: { type: 'text' },
      remediation: { type: 'text' },
      benchmark_id: { type: 'keyword' },
      benchmark_name: { type: 'text' },
      benchmark_version: { type: 'keyword' },
      rule_number: { type: 'keyword' },
      section: { type: 'keyword' },
      level: { type: 'integer' },
      platform: { type: 'keyword' },
      frameworks: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          version: { type: 'keyword' },
          control: { type: 'keyword' },
        },
      },
      tags: { type: 'keyword' },
      enabled: { type: 'boolean' },
      interval: { type: 'integer' },
      prebuilt: { type: 'boolean' },
      resource_type: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'checkInCircleFilled',
    getTitle: (obj) => `Compliance Rule: ${obj.attributes.name}`,
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
};
