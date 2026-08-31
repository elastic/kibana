/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { RULE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { ruleMappings } from '../rule_mappings';
import { ruleModelVersions } from './rule_model_versions';
import {
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
} from '../schemas/rule_saved_object_attributes';

const ruleType: SavedObjectsType = {
  name: RULE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: ruleMappings,
  modelVersions: ruleModelVersions,
};

const THRESHOLD_BUILDER_FIELDS = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: 'count' }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: '>', threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
};

const ruleAttributes = (metadata: Record<string, unknown> = {}) => ({
  kind: 'alert',
  metadata: { name: 'test rule', version: 1, ...metadata },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
  enabled: true,
  createdBy: 'elastic',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2025-01-01T00:00:00.000Z',
});

const ruleDocument = (metadata: Record<string, unknown> = {}): SavedObject => ({
  id: 'rule-1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: ruleAttributes(metadata),
  references: [],
});

describe('ruleModelVersions', () => {
  it('declares consecutive versions starting at 1', () => {
    expect(Object.keys(ruleModelVersions)).toEqual(['1', '2', '3', '4', '5']);
  });

  describe('model version 5 (metadata.builder_fields)', () => {
    const migrator = createModelVersionTestMigrator({ type: ruleType });

    it('is additive, so a v4 rule needs no backfill to become a v5 rule', () => {
      const document = ruleDocument({ builder_type: 'threshold' });

      const migrated = migrator.migrate({ document, fromVersion: 4, toVersion: 5 });

      expect(migrated.attributes).toEqual(document.attributes);
    });

    it('accepts a rule carrying builder fields on create', () => {
      expect(() =>
        ruleSavedObjectAttributesSchemaV4.validate(
          ruleAttributes({ builder_type: 'threshold', builder_fields: THRESHOLD_BUILDER_FIELDS })
        )
      ).not.toThrow();
    });

    it('accepts a rule with no builder fields, so pre-v5 rules stay valid', () => {
      expect(() =>
        ruleSavedObjectAttributesSchemaV4.validate(ruleAttributes({ builder_type: 'threshold' }))
      ).not.toThrow();
    });

    it('does not constrain the shape of builder fields, which the builder owns', () => {
      expect(() =>
        ruleSavedObjectAttributesSchemaV4.validate(
          ruleAttributes({
            builder_type: 'some_future_builder',
            builder_fields: { nested: { arbitrary: [1, 'two', null] } },
          })
        )
      ).not.toThrow();
    });

    // A rollback to model version 4 must still be able to read rules written by
    // version 5, otherwise one builder-authored rule would break the whole
    // rules list (find fails as a whole, not per document).
    it('leaves a rule readable by the previous version after rollback', () => {
      const document = ruleDocument({
        builder_type: 'threshold',
        builder_fields: THRESHOLD_BUILDER_FIELDS,
      });

      const rolledBack = migrator.migrate({ document, fromVersion: 5, toVersion: 4 });

      expect(() =>
        ruleSavedObjectAttributesSchemaV3
          .extends({}, { unknowns: 'ignore' })
          .validate(rolledBack.attributes)
      ).not.toThrow();
    });

    it('does not add mappings, since builder fields are never searched on', () => {
      expect(ruleModelVersions[5]?.changes).toEqual([]);
    });
  });
});
