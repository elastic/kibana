/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
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

type BackfillArgs = Parameters<typeof migrateRuleArtifactsToData>;

/**
 * Mirrors how core applies a backfill: the result is deep-merged into the
 * document's attributes, which is what preserves the legacy `value`.
 */
const migrate = (artifacts?: Array<Record<string, unknown>>) => {
  const document = createDocument(artifacts);
  const { attributes } = migrateRuleArtifactsToData(
    document as BackfillArgs[0],
    {} as BackfillArgs[1]
  );

  return merge({}, document.attributes, attributes);
};

describe('migrateRuleArtifactsToData', () => {
  it('backfills a runbook value into data.content', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: '# Runbook' },
    ]);

    expect(artifacts).toEqual([
      {
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        value: '# Runbook',
        data: { content: '# Runbook' },
      },
    ]);
  });

  it('backfills a dashboard value into data.dashboardId', () => {
    const { artifacts } = migrate([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-123' },
    ]);

    expect(artifacts).toEqual([
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        value: 'dash-123',
        data: { dashboardId: 'dash-123' },
      },
    ]);
  });

  it('falls back to a lossless data.value for unknown artifact types', () => {
    const { artifacts } = migrate([{ id: 'host-1', type: 'host', value: 'host-a' }]);

    expect(artifacts).toEqual([
      { id: 'host-1', type: 'host', value: 'host-a', data: { value: 'host-a' } },
    ]);
  });

  it('keeps the legacy value on the document so a rollback can read it', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
    ]);

    expect(artifacts?.[0]).toHaveProperty('value', 'steps');
  });

  /**
   * The legacy saved object schema allowed a blank `value`. A backfill cannot
   * drop such an artifact — core merges the result into the document, so an
   * omitted array element is restored from disk — and it carries over as a
   * blank field.
   */
  it.each([
    [RUNBOOK_ARTIFACT_TYPE, '', 'content'],
    [DASHBOARD_ARTIFACT_TYPE, '   ', 'dashboardId'],
  ])('carries a blank %s value over as %j', (type, value, dataKey) => {
    const { artifacts } = migrate([{ id: 'blank-1', type, value }]);

    expect(artifacts).toEqual([{ id: 'blank-1', type, value, data: { [dataKey]: value } }]);
  });

  it('backfills every artifact of a mixed array, aligned by index', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' },
      { id: 'host-1', type: 'host', value: 'host-a' },
    ]);

    expect(artifacts).toEqual([
      {
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        value: 'steps',
        data: { content: 'steps' },
      },
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        value: 'dash-1',
        data: { dashboardId: 'dash-1' },
      },
      { id: 'host-1', type: 'host', value: 'host-a', data: { value: 'host-a' } },
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

  it('model version 4 reads the migrated artifacts as id, type and data', () => {
    const attributes = migrate([{ id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' }]);
    const modelVersion4ReadSchema = ruleSavedObjectAttributesSchemaV3.extends(
      {},
      { unknowns: 'ignore' }
    );

    expect(modelVersion4ReadSchema.validate(attributes).artifacts).toEqual([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
    ]);
  });

  /**
   * `value` is deliberately absent from the model version 4 schema: nothing
   * writes it anymore and reads go through `data`. The copy the backfill leaves
   * behind exists only so an older node can still read the document.
   */
  describe('rollback to model version 3', () => {
    const modelVersion3Schema = ruleSavedObjectAttributesSchemaV2.extends(
      {},
      { unknowns: 'ignore' }
    );

    it('reads a migrated rule with artifacts, ignoring the unknown data', () => {
      const attributes = migrate([
        { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
      ]);

      expect(modelVersion3Schema.validate(attributes).artifacts).toEqual([
        { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, value: 'steps' },
      ]);
    });

    it('reads a migrated rule that has no artifacts', () => {
      expect(() => modelVersion3Schema.validate(migrate())).not.toThrow();
    });
  });
});
