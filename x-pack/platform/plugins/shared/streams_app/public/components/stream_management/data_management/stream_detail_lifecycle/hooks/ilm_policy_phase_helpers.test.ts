/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmPolicy,
  IlmPolicyDeletePhase,
  IlmPolicyHotPhase,
  IlmPolicyPhases,
} from '@kbn/streams-schema';

import { buildModifiedPhasesFromEdit } from './ilm_policy_phase_helpers';

describe('buildModifiedPhasesFromEdit', () => {
  it('clears rollover action when rollover sanitizes to an empty object', () => {
    const policy: IlmPolicy = {
      name: 'p1',
      phases: {
        hot: {
          name: 'hot',
          size_in_bytes: 0,
          rollover: { max_age: '1d' },
        },
      },
    };

    const rolloverWithUndefined = {
      max_age: undefined,
    } as unknown as IlmPolicyHotPhase['rollover'];

    const nextPhases: IlmPolicyPhases = {
      hot: {
        name: 'hot',
        size_in_bytes: 0,
        // Simulate a user clearing all rollover fields: serializer can produce an object
        // with only undefined values, which sanitizes to {}.
        rollover: rolloverWithUndefined,
      },
    };

    const out = buildModifiedPhasesFromEdit(policy, nextPhases);
    expect(out.hot?.actions?.rollover).toBeUndefined();
  });

  it('clears delete_searchable_snapshot when it is explicitly present but undefined', () => {
    const policy: IlmPolicy = {
      name: 'p2',
      phases: {
        delete: {
          name: 'delete',
          min_age: '1d',
          delete_searchable_snapshot: true,
        },
      },
    };

    const deletePhaseWithUndefined = {
      name: 'delete',
      min_age: '1d',
      // Explicitly present but undefined should clear any prior state.
      delete_searchable_snapshot: undefined,
    } as unknown as IlmPolicyDeletePhase;

    const nextPhases: IlmPolicyPhases = {
      delete: deletePhaseWithUndefined,
    };

    const out = buildModifiedPhasesFromEdit(policy, nextPhases);
    // ES ILM requires `actions` in all phases; we keep a `delete` action but clear the flag.
    expect(out.delete?.actions).toBeDefined();
    expect(out.delete?.actions?.delete).toBeDefined();
    const deleteAction = out.delete?.actions?.delete;
    expect(deleteAction).toEqual(expect.any(Object));
    expect((deleteAction as Record<string, unknown>).delete_searchable_snapshot).toBeUndefined();
  });
});
