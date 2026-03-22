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
      name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text' },
      query: { type: 'text' },
      remediation: { type: 'text' },
      benchmark: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          version: { type: 'keyword' },
          version_info: {
            properties: {
              major: { type: 'integer' },
              minor: { type: 'integer' },
              patch: { type: 'integer' },
              release_date: { type: 'date' },
              status: { type: 'keyword' }, // 'current', 'deprecated', 'legacy'
              superseded_by: { type: 'keyword' }, // version that replaces this one
              compatibility: {
                properties: {
                  min_platform_version: { type: 'keyword' },
                  max_platform_version: { type: 'keyword' },
                  compatible_platforms: { type: 'keyword' },
                },
              },
            },
          },
          posture_type: { type: 'keyword' },
        },
      },
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
      // Version management fields
      rule_version: { type: 'keyword' }, // Rule-specific version (e.g., "1.2.0")
      rule_schema_version: { type: 'integer' }, // Schema version for migration
      source_rule_id: { type: 'keyword' }, // Original rule ID for version tracking
      migration_status: { type: 'keyword' }, // 'pending', 'completed', 'failed'
      migration_metadata: {
        properties: {
          migrated_from: { type: 'keyword' }, // Previous version
          migrated_at: { type: 'date' },
          migration_notes: { type: 'text' },
          compatibility_issues: { type: 'text' },
        },
      },
      // Benchmark version compatibility
      supported_benchmark_versions: { type: 'keyword' }, // Array of compatible versions
      deprecated_in_version: { type: 'keyword' }, // When this rule was deprecated
      removed_in_version: { type: 'keyword' }, // When this rule will be/was removed
      replacement_rule_id: { type: 'keyword' }, // Rule that replaces this one
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
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            'benchmark.version_info': {
              properties: {
                major: { type: 'integer' },
                minor: { type: 'integer' },
                patch: { type: 'integer' },
                release_date: { type: 'date' },
                status: { type: 'keyword' },
                superseded_by: { type: 'keyword' },
                compatibility: {
                  properties: {
                    min_platform_version: { type: 'keyword' },
                    max_platform_version: { type: 'keyword' },
                    compatible_platforms: { type: 'keyword' },
                  },
                },
              },
            },
            rule_version: { type: 'keyword' },
            rule_schema_version: { type: 'integer' },
            source_rule_id: { type: 'keyword' },
            migration_status: { type: 'keyword' },
            migration_metadata: {
              properties: {
                migrated_from: { type: 'keyword' },
                migrated_at: { type: 'date' },
                migration_notes: { type: 'text' },
                compatibility_issues: { type: 'text' },
              },
            },
            supported_benchmark_versions: { type: 'keyword' },
            deprecated_in_version: { type: 'keyword' },
            removed_in_version: { type: 'keyword' },
            replacement_rule_id: { type: 'keyword' },
          },
        },
      ],
    },
  },
};
