/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { buildIlmPreviewPhases } from './preview_models';

const ilmPhases = {
  hot: { color: '#ff0000', description: 'Hot phase' },
  warm: { color: '#ffaa00', description: 'Warm phase' },
  cold: { color: '#00aaff', description: 'Cold phase' },
  delete: { color: '#000000', description: 'Delete phase' },
};

describe('buildIlmPreviewPhases', () => {
  const policy: SerializedPolicy = {
    name: 'test-policy',
    phases: {
      hot: { min_age: '0ms', actions: {} },
      warm: { min_age: '2d', actions: {} },
      cold: { min_age: '30d', actions: {} },
      delete: { min_age: '90d', actions: {} },
    },
  };

  it('never includes per-phase size or document counts', () => {
    const phases = buildIlmPreviewPhases({ policy, ilmPhases });

    expect(phases).toHaveLength(4);
    for (const phase of phases) {
      expect(phase.size).toBeUndefined();
      expect(phase.sizeInBytes).toBeUndefined();
      expect(phase.docsCount).toBeUndefined();
    }
  });

  it('still resolves min_age, grow and labels per phase', () => {
    const phases = buildIlmPreviewPhases({ policy, ilmPhases });

    expect(phases[0]).toMatchObject({ label: 'hot', min_age: '0ms' });
    expect(phases[1]).toMatchObject({ label: 'warm', min_age: '2d' });
    expect(phases[2]).toMatchObject({ label: 'cold', min_age: '30d' });
    expect(phases[3]).toMatchObject({ label: 'delete', isDelete: true, min_age: '90d' });
  });

  it('defaults hot min_age to 0d when missing', () => {
    const phases = buildIlmPreviewPhases({
      policy: {
        name: 'test-policy',
        phases: { hot: { actions: {} }, warm: { min_age: '2d', actions: {} } },
      },
      ilmPhases,
    });

    expect(phases[0]).toMatchObject({ label: 'hot', min_age: '0d' });
    expect(phases[1]).toMatchObject({ label: 'warm', min_age: '2d' });
  });
});
