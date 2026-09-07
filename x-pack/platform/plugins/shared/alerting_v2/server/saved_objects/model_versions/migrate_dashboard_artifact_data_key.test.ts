/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { RULE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { migrateDashboardArtifactDataKey } from './migrate_dashboard_artifact_data_key';

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

type TransformArgs = Parameters<typeof migrateDashboardArtifactDataKey>;

const migrate = (artifacts?: Array<Record<string, unknown>>) => {
  const document = createDocument(artifacts);
  return migrateDashboardArtifactDataKey(document as TransformArgs[0], {} as TransformArgs[1])
    .document.attributes;
};

describe('migrateDashboardArtifactDataKey', () => {
  it('renames data.dashboardId to data.dashboard_id on dashboard artifacts', () => {
    const { artifacts } = migrate([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-123' } },
    ]);

    expect(artifacts).toEqual([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'dash-123' } },
    ]);
  });

  it('drops the legacy key so it cannot leak into API responses', () => {
    const { artifacts } = migrate([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-123' } },
    ]);

    expect(artifacts?.[0].data).not.toHaveProperty('dashboardId');
  });

  it('is idempotent: an existing dashboard_id wins over the legacy key', () => {
    const { artifacts } = migrate([
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboardId: 'stale', dashboard_id: 'current' },
      },
    ]);

    expect(artifacts).toEqual([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'current' } },
    ]);
  });

  it('leaves dashboard artifacts without the legacy key untouched', () => {
    const { artifacts } = migrate([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'dash-123' } },
    ]);

    expect(artifacts).toEqual([
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'dash-123' } },
    ]);
  });

  it('leaves non-dashboard artifacts untouched, even with a dashboardId-shaped key', () => {
    const { artifacts } = migrate([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
      { id: 'custom-1', type: 'obs.custom', data: { dashboardId: 'not-ours' } },
    ]);

    expect(artifacts).toEqual([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
      { id: 'custom-1', type: 'obs.custom', data: { dashboardId: 'not-ours' } },
    ]);
  });

  it('preserves other data fields on a migrated artifact', () => {
    const { artifacts } = migrate([
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboardId: 'dash-123', note: 'kept' },
      },
    ]);

    expect(artifacts).toEqual([
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboard_id: 'dash-123', note: 'kept' },
      },
    ]);
  });

  it('returns the document unchanged when there are no dashboard artifacts', () => {
    const document = createDocument([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
    ]);
    const result = migrateDashboardArtifactDataKey(
      document as TransformArgs[0],
      {} as TransformArgs[1]
    );

    expect(result.document).toBe(document);
  });

  it('returns the document unchanged when there are no artifacts', () => {
    const document = createDocument();
    const result = migrateDashboardArtifactDataKey(
      document as TransformArgs[0],
      {} as TransformArgs[1]
    );

    expect(result.document).toBe(document);
  });

  it('preserves all non-artifact attributes', () => {
    expect(
      migrate([{ id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'x' } }])
    ).toMatchObject(baseAttributes);
  });
});
