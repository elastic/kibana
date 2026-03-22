/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const COMPLIANCE_EXCEPTION_SO_TYPE = 'endpoint-compliance-exception';

export const complianceExceptionType: SavedObjectsType = {
  name: COMPLIANCE_EXCEPTION_SO_TYPE,
  indexPattern: '.kibana_security_solution',
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      // Basic exception identification
      exception_id: { type: 'keyword' },
      name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text' },
      
      // Scoping - hierarchical from most to least restrictive
      scope: {
        properties: {
          type: { type: 'keyword' }, // 'global', 'benchmark', 'rule', 'host'
          target_id: { type: 'keyword' }, // benchmark_id, rule_id, or host_id
          target_name: { type: 'keyword' }, // human-readable target name
          additional_filters: {
            type: 'nested',
            properties: {
              field: { type: 'keyword' },
              operator: { type: 'keyword' }, // 'equals', 'contains', 'regex'
              value: { type: 'keyword' },
            },
          },
        },
      },

      // Rule targeting
      rule_criteria: {
        properties: {
          rule_ids: { type: 'keyword' }, // Array of specific rule IDs
          benchmark_ids: { type: 'keyword' }, // Array of benchmark IDs
          sections: { type: 'keyword' }, // Array of CIS sections
          levels: { type: 'integer' }, // Array of CIS levels
          platforms: { type: 'keyword' }, // Array of platforms
          tags: { type: 'keyword' }, // Array of rule tags
          frameworks: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              controls: { type: 'keyword' },
            },
          },
        },
      },

      // Host targeting
      host_criteria: {
        properties: {
          host_ids: { type: 'keyword' }, // Array of specific host IDs
          host_names: { type: 'keyword' }, // Array of hostnames (supports wildcards)
          os_families: { type: 'keyword' }, // Array of OS families
          os_versions: { type: 'keyword' }, // Array of OS versions (supports ranges)
          agent_versions: { type: 'keyword' }, // Array of agent versions
          tags: { type: 'keyword' }, // Array of host tags
          groups: { type: 'keyword' }, // Array of host groups/organizational units
        },
      },

      // Temporal scope
      time_scope: {
        properties: {
          type: { type: 'keyword' }, // 'permanent', 'temporary', 'scheduled'
          start_date: { type: 'date' },
          end_date: { type: 'date' },
          expiration_date: { type: 'date' },
          timezone: { type: 'keyword' },
          recurring: {
            properties: {
              enabled: { type: 'boolean' },
              pattern: { type: 'keyword' }, // 'daily', 'weekly', 'monthly'
              schedule: { type: 'text' }, // Cron expression for complex patterns
            },
          },
        },
      },

      // Approval and governance
      approval: {
        properties: {
          status: { type: 'keyword' }, // 'pending', 'approved', 'rejected', 'auto_approved'
          approver_id: { type: 'keyword' },
          approver_name: { type: 'keyword' },
          approved_at: { type: 'date' },
          approval_reason: { type: 'text' },
          approval_conditions: { type: 'text' }, // Conditions under which approval is valid
          risk_assessment: {
            properties: {
              risk_level: { type: 'keyword' }, // 'low', 'medium', 'high', 'critical'
              business_justification: { type: 'text' },
              compensating_controls: { type: 'text' },
              review_required: { type: 'boolean' },
              next_review_date: { type: 'date' },
            },
          },
        },
      },

      // Audit trail
      audit: {
        properties: {
          created_by: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_by: { type: 'keyword' },
          updated_at: { type: 'date' },
          version: { type: 'integer' },
          change_history: {
            type: 'nested',
            properties: {
              version: { type: 'integer' },
              changed_by: { type: 'keyword' },
              changed_at: { type: 'date' },
              change_type: { type: 'keyword' }, // 'created', 'updated', 'approved', 'expired', 'revoked'
              change_description: { type: 'text' },
              previous_values: { type: 'object', enabled: false }, // Store previous state
            },
          },
        },
      },

      // Status and lifecycle
      status: { type: 'keyword' }, // 'active', 'expired', 'revoked', 'pending'
      enabled: { type: 'boolean' },
      priority: { type: 'integer' }, // Higher number = higher priority for conflict resolution
      
      // Impact tracking
      impact: {
        properties: {
          affected_hosts: { type: 'integer' },
          affected_rules: { type: 'integer' },
          findings_suppressed: { type: 'long' },
          last_suppression_date: { type: 'date' },
          suppression_rate: { type: 'float' }, // Percentage of findings suppressed
          effectiveness: {
            properties: {
              false_positive_reduction: { type: 'float' },
              operational_impact: { type: 'keyword' }, // 'low', 'medium', 'high'
              security_risk_increase: { type: 'keyword' }, // 'none', 'low', 'medium', 'high'
            },
          },
        },
      },

      // Integration metadata
      integration: {
        properties: {
          source: { type: 'keyword' }, // 'ui', 'api', 'automated', 'imported'
          source_system: { type: 'keyword' }, // External system that created this exception
          correlation_id: { type: 'keyword' }, // For tracking related exceptions
          tags: { type: 'keyword' }, // User-defined tags for organization
          categories: { type: 'keyword' }, // Categorization for reporting
        },
      },

      // Comments and documentation
      comments: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          author: { type: 'keyword' },
          created_at: { type: 'date' },
          content: { type: 'text' },
          type: { type: 'keyword' }, // 'note', 'justification', 'review', 'escalation'
        },
      },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'minus',
    getTitle: (obj) => `Compliance Exception: ${obj.attributes.name}`,
    onExport: (context, objects) => {
      // Remove sensitive audit information during export
      return objects.map(obj => ({
        ...obj,
        attributes: {
          ...obj.attributes,
          audit: {
            ...obj.attributes.audit,
            change_history: [], // Remove detailed change history
          },
        },
      }));
    },
    onImport: (obj) => {
      // Reset audit fields during import
      return {
        ...obj,
        attributes: {
          ...obj.attributes,
          audit: {
            ...obj.attributes.audit,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            change_history: [
              {
                version: 1,
                changed_at: new Date().toISOString(),
                change_type: 'imported',
                change_description: 'Exception imported from another instance',
              },
            ],
          },
          status: 'pending', // Require re-approval after import
        },
      };
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
};