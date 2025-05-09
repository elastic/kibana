/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { RawRule } from '../../../types';
import { transformRawArtifactsToDomainArtifacts } from './transform_raw_artifacts_to_domain_artifacts';

describe('transformRawArtifactsToDomainArtifacts', () => {
  it('should return default artifacts if rawArtifacts is undefined', () => {
    const result = transformRawArtifactsToDomainArtifacts('1', undefined, []);
    expect(result).toEqual({ dashboards: [], investigation_guide: { blob: '' } });
  });

  it('should return artifacts with injected references', () => {
    const rawArtifacts: RawRule['artifacts'] = {
      dashboards: [
        {
          refId: 'dashboard-1',
        },
        {
          refId: 'dashboard-2',
        },
      ],
    };
    const references: SavedObjectReference[] = [
      {
        id: 'dashboard_0',
        name: 'dashboard-1',
        type: 'dashboard',
      },
      {
        id: 'dashboard_1',
        name: 'dashboard-2',
        type: 'dashboard',
      },
    ];
    const result = transformRawArtifactsToDomainArtifacts('1', rawArtifacts, references);
    expect(result).toEqual({
      dashboards: [
        {
          id: 'dashboard_0',
        },
        {
          id: 'dashboard_1',
        },
      ],
      investigation_guide: { blob: '' },
    });
  });

  it('should return artifacts with empty dashboards array if no dashboards in rawArtifacts', () => {
    const rawArtifacts: RawRule['artifacts'] = {};
    const references: SavedObjectReference[] = [];
    const result = transformRawArtifactsToDomainArtifacts('1', rawArtifacts, references);
    expect(result).toEqual({ dashboards: [], investigation_guide: { blob: '' } });
  });

  it('should return artifacts with injected references and empty dashboards array if no dashboards in rawArtifacts', () => {
    const rawArtifacts: RawRule['artifacts'] = {};
    const references: SavedObjectReference[] = [
      {
        id: 'dashboard-1',
        name: 'dashboard_0',
        type: 'dashboard',
      },
    ];
    const result = transformRawArtifactsToDomainArtifacts('1', rawArtifacts, references);
    expect(result).toEqual({ dashboards: [], investigation_guide: { blob: '' } });
  });

  it('throws an error if no references found', () => {
    const rawArtifacts: RawRule['artifacts'] = {
      dashboards: [
        {
          refId: 'dashboard-1',
        },
      ],
    };
    const references: SavedObjectReference[] = [];
    expect(() =>
      transformRawArtifactsToDomainArtifacts('1', rawArtifacts, references)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Artifacts reference \\"dashboard-1\\" not found in rule id: 1"`
    );
  });
});
