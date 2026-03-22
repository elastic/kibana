/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  addSchemaVersionToRules,
  addBenchmarkVersionMetadata,
  normalizeQueryInterval,
  addEnabledFieldToRules,
  ensureTagsArray,
  addPrebuiltFlag,
  addTimestamps,
  addStatusToExceptions,
  normalizeExceptionScope,
  addAuditMetadataToExceptions,
} from './compliance_v1_migrations';

describe('Compliance Migrations', () => {
  describe('Rule Migrations', () => {
    describe('addSchemaVersionToRules', () => {
      it('should add schema_version field', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            rule_id: 'test-rule',
            name: 'Test Rule',
          },
        };

        const migrated = addSchemaVersionToRules(doc);

        expect(migrated.attributes.schema_version).toBe(1);
      });
    });

    describe('addBenchmarkVersionMetadata', () => {
      it('should add version to benchmark without version', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            benchmark: {
              id: 'cis-linux',
              name: 'CIS Linux',
            },
          },
        };

        const migrated = addBenchmarkVersionMetadata(doc);

        expect(migrated.attributes.benchmark).toMatchObject({
          id: 'cis-linux',
          name: 'CIS Linux',
          version: '1.0.0',
          posture_type: 'endpoint',
        });
      });

      it('should not modify benchmark with existing version', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            benchmark: {
              id: 'cis-linux',
              version: '2.0.0',
            },
          },
        };

        const migrated = addBenchmarkVersionMetadata(doc);

        expect(migrated.attributes.benchmark.version).toBe('2.0.0');
      });
    });

    describe('normalizeQueryInterval', () => {
      it('should convert minutes to seconds for legacy rules', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            interval: 100000, // Likely minutes (> 24h in seconds)
          },
        };

        const migrated = normalizeQueryInterval(doc);

        expect(migrated.attributes.interval).toBe(100000 * 60);
        expect(migrated.attributes.interval_unit).toBe('seconds');
      });

      it('should not convert intervals already in seconds', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            interval: 3600, // 1 hour in seconds
          },
        };

        const migrated = normalizeQueryInterval(doc);

        expect(migrated.attributes.interval).toBe(3600);
        expect(migrated.attributes.interval_unit).toBe('seconds');
      });
    });

    describe('addEnabledFieldToRules', () => {
      it('should add enabled=true for rules without enabled field', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            rule_id: 'test',
          },
        };

        const migrated = addEnabledFieldToRules(doc);

        expect(migrated.attributes.enabled).toBe(true);
      });

      it('should not modify existing enabled field', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            enabled: false,
          },
        };

        const migrated = addEnabledFieldToRules(doc);

        expect(migrated.attributes.enabled).toBe(false);
      });
    });

    describe('ensureTagsArray', () => {
      it('should create empty tags array if missing', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {},
        };

        const migrated = ensureTagsArray(doc);

        expect(migrated.attributes.tags).toEqual([]);
      });

      it('should not modify existing tags array', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            tags: ['existing', 'tags'],
          },
        };

        const migrated = ensureTagsArray(doc);

        expect(migrated.attributes.tags).toEqual(['existing', 'tags']);
      });
    });

    describe('addPrebuiltFlag', () => {
      it('should mark CIS rules as prebuilt', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            rule_id: 'cis-linux-1.1.1',
          },
        };

        const migrated = addPrebuiltFlag(doc);

        expect(migrated.attributes.prebuilt).toBe(true);
      });

      it('should mark custom rules as not prebuilt', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            rule_id: 'custom-rule-001',
          },
        };

        const migrated = addPrebuiltFlag(doc);

        expect(migrated.attributes.prebuilt).toBe(false);
      });
    });

    describe('addTimestamps', () => {
      it('should add created_at and updated_at', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {},
        };

        const migrated = addTimestamps(doc);

        expect(migrated.attributes.created_at).toBeDefined();
        expect(migrated.attributes.updated_at).toBeDefined();
        expect(typeof migrated.attributes.created_at).toBe('string');
      });

      it('should preserve existing timestamps', () => {
        const existingTime = '2026-01-01T00:00:00Z';
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-rule',
          attributes: {
            created_at: existingTime,
          },
          updated_at: existingTime,
        };

        const migrated = addTimestamps(doc);

        expect(migrated.attributes.created_at).toBe(existingTime);
        expect(migrated.attributes.updated_at).toBe(existingTime);
      });
    });
  });

  describe('Exception Migrations', () => {
    describe('addStatusToExceptions', () => {
      it('should mark expired exceptions', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday

        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {
            time_scope: {
              type: 'temporary',
              end_date: pastDate,
            },
          },
        };

        const migrated = addStatusToExceptions(doc);

        expect(migrated.attributes.status).toBe('expired');
      });

      it('should mark active exceptions', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {
            time_scope: {
              type: 'temporary',
              end_date: futureDate,
            },
            enabled: true,
          },
        };

        const migrated = addStatusToExceptions(doc);

        expect(migrated.attributes.status).toBe('active');
      });

      it('should mark disabled exceptions', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {
            enabled: false,
          },
        };

        const migrated = addStatusToExceptions(doc);

        expect(migrated.attributes.status).toBe('disabled');
      });
    });

    describe('normalizeExceptionScope', () => {
      it('should create default global scope if missing', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {},
        };

        const migrated = normalizeExceptionScope(doc);

        expect(migrated.attributes.scope).toEqual({
          type: 'global',
        });
      });

      it('should add type field if scope exists but has no type', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {
            scope: {
              target_id: 'host-001',
            },
          },
        };

        const migrated = normalizeExceptionScope(doc);

        expect(migrated.attributes.scope.type).toBe('global');
      });
    });

    describe('addAuditMetadataToExceptions', () => {
      it('should add audit trail for new exceptions', () => {
        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {},
        };

        const migrated = addAuditMetadataToExceptions(doc);

        expect(migrated.attributes.created_by).toBe('system');
        expect(migrated.attributes.audit_trail).toHaveLength(1);
        expect(migrated.attributes.audit_trail[0]).toMatchObject({
          action: 'created',
          user: 'system',
        });
      });

      it('should preserve existing audit trail', () => {
        const existingTrail = [
          { action: 'created', timestamp: '2026-01-01T00:00:00Z', user: 'admin' },
          { action: 'updated', timestamp: '2026-01-02T00:00:00Z', user: 'admin' },
        ];

        const doc: SavedObjectUnsanitizedDoc = {
          id: '1',
          type: 'osquery-compliance-exception',
          attributes: {
            audit_trail: existingTrail,
            created_by: 'admin',
          },
        };

        const migrated = addAuditMetadataToExceptions(doc);

        expect(migrated.attributes.audit_trail).toEqual(existingTrail);
        expect(migrated.attributes.created_by).toBe('admin');
      });
    });
  });
});
