/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { mapArtifacts } from './artifact_mappers';

describe('mapArtifacts', () => {
  it('returns undefined for an empty list', () => {
    expect(mapArtifacts([])).toBeUndefined();
    expect(mapArtifacts(undefined)).toBeUndefined();
  });

  it('projects artifacts to the public { id, type, data } shape', () => {
    const artifacts = [
      {
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        data: { content: 'steps' },
        value: 'steps',
      },
      {
        id: 'dashboard-1',
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboardId: 'dash-1' },
        value: 'dash-1',
      },
    ];

    expect(mapArtifacts(artifacts)).toEqual([
      { id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } },
      { id: 'dashboard-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
    ]);
  });
});
