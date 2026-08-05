/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { RULE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import {
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
} from '../schemas/rule_saved_object_attributes';
import { migrateRuleArtifactsToData } from './migrate_rule_artifacts_to_data';

const baseAttributes = {
  kind: 'alert' as const,
  metadata: { name: 'My rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: {
    format: 'standalone' as const,
    breach: { query: 'FROM logs-* | LIMIT 1' },
  },
  enabled: true,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createDocument = (artifacts?: Array<Record<string, unknown>>) => ({
  id: 'rule-1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    ...baseAttributes,
    ...(artifacts ? { artifacts } : {}),
  },
  references: [],
});

type TransformArgs = Parameters<typeof migrateRuleArtifactsToData>;

const migrate = (artifacts?: Array<Record<string, unknown>>) => {
  const { document } = migrateRuleArtifactsToData(
    createDocument(artifacts) as TransformArgs[0],
    {} as TransformArgs[1]
  );

  return document.attributes;
};

describe('migrateRuleArtifactsToData', () => {
  it('migrates a runbook value into data.content', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: '# Runbook' },
    ]);

    expect(artifacts).toEqual([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '# Runbook' } },
    ]);
  });

  it('migrates a dashboard value into data.dashboardId', () => {
    const { artifacts } = migrate([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-123' },
    ]);

    expect(artifacts).toEqual([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-123' } },
    ]);
  });

  it('falls back to a lossless data.value for unknown artifact types', () => {
    const { artifacts } = migrate([{ id: 'host-1', type: 'host', value: 'host-a' }]);

    expect(artifacts).toEqual([{ id: 'host-1', type: 'host', data: { value: 'host-a' } }]);
  });

  it.each([
    [RUNBOOK_ARTIFACT_TYPE, ''],
    [RUNBOOK_ARTIFACT_TYPE, '   '],
    [DASHBOARD_ARTIFACT_TYPE, ' '],
  ])('drops a %s artifact whose legacy value is %j', (type, value) => {
    const { artifacts } = migrate([
      { id: 'blank-1', type, value },
      { id: 'kept-1', type: RUNBOOK_ARTIFACT_TYPE, value: '# Kept' },
    ]);

    expect(artifacts).toEqual([
      { id: 'kept-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '# Kept' } },
    ]);
  });

  it('keeps a blank value for an unknown type, which has no required fields', () => {
    const { artifacts } = migrate([{ id: 'host-1', type: 'host', value: '' }]);

    expect(artifacts).toEqual([{ id: 'host-1', type: 'host', data: { value: '' } }]);
  });

  it('removes the legacy value from the document', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
    ]);

    expect(artifacts?.[0]).not.toHaveProperty('value');
  });

  it('produces attributes that satisfy the model version 4 schema', () => {
    const attributes = migrate([{ id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' }]);

    expect(() => ruleSavedObjectAttributesSchemaV3.validate(attributes)).not.toThrow();
  });

  /**
   * Documents the accepted trade-off of dropping `value`: model version 3 is no
   * longer able to read a migrated rule that has artifacts. Its
   * forwardCompatibility schema ignores the unknown `data` and then fails on the
   * `value` its artifact schema still requires. A rule without artifacts is
   * unaffected.
   */
  describe('rollback to model version 3 (knowingly unsupported)', () => {
    const modelVersion3Schema = ruleSavedObjectAttributesSchemaV2.extends(
      {},
      { unknowns: 'ignore' }
    );

    it('cannot read a migrated rule that has artifacts', () => {
      const attributes = migrate([
        { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
      ]);

      expect(() => modelVersion3Schema.validate(attributes)).toThrow(
        /\[artifacts\.0\.value\]: expected value of type \[string\]/
      );
    });

    it('can still read a migrated rule that has no artifacts', () => {
      expect(() => modelVersion3Schema.validate(migrate())).not.toThrow();
    });
  });

  it('migrates every artifact of a mixed array, aligned by index', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' },
      { id: 'host-1', type: 'host', value: 'host-a' },
    ]);

    expect(artifacts).toEqual([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
      { id: 'host-1', type: 'host', data: { value: 'host-a' } },
    ]);
  });

  it('leaves a document without artifacts unchanged', () => {
    const attributes = migrate();

    expect(attributes).toEqual(baseAttributes);
    expect(attributes).not.toHaveProperty('artifacts');
  });

  it('preserves an empty artifacts array', () => {
    expect(migrate([]).artifacts).toEqual([]);
  });

  it('preserves all non-artifact attributes', () => {
    expect(
      migrate([{ id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' }])
    ).toMatchObject(baseAttributes);
  });
});
