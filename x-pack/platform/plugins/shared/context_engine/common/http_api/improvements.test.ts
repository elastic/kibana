/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiInputSchema } from '../step_types/create_ki';
import { updateKiInputSchema } from '../step_types/update_ki';
import type { ImprovementPayload } from './improvements';

/**
 * The KI half of an improvement payload is the input to the createKi / updateKi steps that apply
 * it. These pin the two together: a payload that typechecks has to be one the step accepts, so a
 * proposal cannot fail at apply time over a shape the runner was allowed to produce.
 */
describe('improvement payload', () => {
  it('carries an `add_ki` document the createKi step accepts unchanged', () => {
    const payload: ImprovementPayload = {
      ki: {
        type: 'index_metadata',
        title: 'logs-* index profile',
        description: 'Profile of the logs indices',
        content: 'Backing index: logs-*',
        tags: ['logs'],
        attributes: { esql: 'FROM logs-* | LIMIT 1' },
      },
    };

    const parsed = createKiInputSchema.parse({ ai_index_id: 'sales', ki: payload.ki });

    expect(parsed.ki).toEqual(payload.ki);
  });

  it('carries an `edit_ki` patch the updateKi step accepts unchanged', () => {
    const payload: ImprovementPayload = { ki_patch: { content: 'Backing index: logs-2024-*' } };

    const parsed = updateKiInputSchema.parse({
      ai_index_id: 'sales',
      ki_id: 'ki-1',
      ki: payload.ki_patch,
    });

    expect(parsed.ki).toEqual(payload.ki_patch);
  });

  it('does not accept custom top-level KI fields, because the step strips them', () => {
    // `attributes` is the KI contract's escape hatch; the step schemas are plain `z.object()`, so
    // an unknown top-level key is dropped on apply. The payload type refuses it up front rather
    // than letting a run propose a field that silently disappears later.
    const parsed = createKiInputSchema.parse({
      ai_index_id: 'sales',
      ki: { type: 'document', title: 'Custom', custom_field: 'dropped' },
    });

    expect(parsed.ki).not.toHaveProperty('custom_field');
  });
});
