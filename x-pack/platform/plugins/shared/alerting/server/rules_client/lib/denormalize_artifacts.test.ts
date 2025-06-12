/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { denormalizeArtifacts } from './denormalize_artifacts';

describe('denormalizeArtifacts', () => {
  it('returns empty artifacts and references if no artifacts are provided', () => {
    const { artifacts, references } = denormalizeArtifacts(undefined);
    expect(artifacts).toEqual({
      dashboards: [],
      investigation_guide: { blob: '' },
    });
    expect(references).toEqual([]);
  });

  it('returns denormalized artifacts and references', () => {
    const ruleArtifacts = {
      dashboards: [
        {
          id: '123',
        },
        {
          id: '456',
        },
      ],
      investigation_guide: {
        blob: '## Summary',
      },
    };
    const { artifacts, references } = denormalizeArtifacts(ruleArtifacts);
    expect(artifacts).toEqual({
      dashboards: [
        {
          refId: 'dashboard_0',
        },
        {
          refId: 'dashboard_1',
        },
      ],
      investigation_guide: ruleArtifacts.investigation_guide,
    });
    expect(references).toEqual([
      {
        id: '123',
        name: 'dashboard_0',
        type: 'dashboard',
      },
      {
        id: '456',
        name: 'dashboard_1',
        type: 'dashboard',
      },
    ]);
  });
});
