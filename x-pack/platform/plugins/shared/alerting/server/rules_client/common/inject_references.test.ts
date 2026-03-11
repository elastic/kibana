/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { injectReferencesIntoArtifacts } from './inject_references';

describe('injectReferencesIntoArtifacts', () => {
  it('returns default value if no artifacts are provided', () => {
    expect(injectReferencesIntoArtifacts('test-id', undefined, [])).toEqual({
      dashboards: [],
      investigation_guide: { blob: '' },
    });
  });

  it('includes investigation guide fields', () => {
    expect(
      injectReferencesIntoArtifacts('test-id', { investigation_guide: { blob: '# Summary' } }, [])
    ).toEqual({
      dashboards: [],
      investigation_guide: { blob: '# Summary' },
    });
  });

  it('throws an error if references are not provided', () => {
    const artifacts = {
      dashboards: [
        {
          refId: 'dashboard_1',
        },
        {
          refId: 'dashboard_2',
        },
      ],
    };
    expect(() => injectReferencesIntoArtifacts('test-id', artifacts)).toThrow(
      'Artifacts reference "dashboard_1" not found in rule id: test-id'
    );
  });

  it('throws an error if the dashboard reference is not found', () => {
    const artifacts = {
      dashboards: [
        {
          refId: 'dashboard_1',
        },
      ],
    };
    const refs: SavedObjectReference[] = [];
    expect(() => injectReferencesIntoArtifacts('test-id', artifacts, refs)).toThrow(
      'Artifacts reference "dashboard_1" not found in rule id: test-id'
    );
  });

  it('returns the artifacts with injected references', () => {
    const artifacts = {
      dashboards: [
        {
          refId: 'dashboard_1',
        },
        {
          refId: 'dashboard_2',
        },
      ],
      investigation_guide: {
        blob: 'test',
      },
    };
    const refs: SavedObjectReference[] = [
      {
        id: '123',
        name: 'dashboard_1',
        type: 'dashboard',
      },
      {
        id: '456',
        name: 'dashboard_2',
        type: 'dashboard',
      },
    ];
    const result = injectReferencesIntoArtifacts('test-id', artifacts, refs);
    expect(result).toEqual({
      dashboards: [
        {
          id: '123',
        },
        {
          id: '456',
        },
      ],
      investigation_guide: {
        blob: 'test',
      },
    });
  });
});
