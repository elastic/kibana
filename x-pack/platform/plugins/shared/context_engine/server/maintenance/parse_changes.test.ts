/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMaintenanceChanges } from './parse_changes';

describe('parseMaintenanceChanges', () => {
  it('fills in the lists the model left out', () => {
    expect(parseMaintenanceChanges({})).toEqual({
      changeSet: { merges: [], contradictions: [], rewrites: [], summaries: [], relationships: [] },
      rejected: [],
    });
    expect(parseMaintenanceChanges(undefined)).toEqual(parseMaintenanceChanges({}));
  });

  it('drops empty optional text and cuts a long reason', () => {
    const parsed = parseMaintenanceChanges({
      merges: [
        {
          survivor: 'e-1',
          absorbed: ['e-2'],
          title: '',
          description: '',
          reason: 'r'.repeat(2000),
        },
      ],
    });

    expect(parsed).toEqual({
      changeSet: expect.objectContaining({
        merges: [{ survivor: 'e-1', absorbed: ['e-2'], reason: 'r'.repeat(1024) }],
      }),
      rejected: [],
    });
  });

  it('rejects an incomplete change on its own, keeping the others', () => {
    const parsed = parseMaintenanceChanges({
      rewrites: [
        { id: 'f-1', content: '', reason: 'r' },
        { id: 'f-2', content: 'Kept.', reason: 'r' },
      ],
      summaries: [{ id: 'e-1', reason: 'r' }],
    });

    expect(parsed).toEqual({
      changeSet: expect.objectContaining({
        rewrites: [{ id: 'f-2', content: 'Kept.', reason: 'r' }],
        summaries: [],
      }),
      rejected: [
        { item: 'rewrite 1', reason: expect.stringContaining('incomplete: content') },
        { item: 'summary 1', reason: expect.stringContaining('incomplete: content') },
      ],
    });
  });

  it('rejects a list the model returned as something else, and fails on changes that are not an object', () => {
    expect(
      parseMaintenanceChanges({
        rewrites: { id: 'f-1', content: 'Corrected', reason: 'Deleted source' },
        merges: null,
      })
    ).toEqual({
      changeSet: expect.objectContaining({ rewrites: [], merges: [] }),
      rejected: [
        { item: 'rewrites', reason: 'the model returned it as something other than a list' },
      ],
    });
    expect(parseMaintenanceChanges('nothing to change')).toEqual({
      error: 'the changes are not an object',
    });
  });

  it('fails on more changes than a batch can hold', () => {
    const parsed = parseMaintenanceChanges({
      relationships: Array.from({ length: 10000 }, (_, index) => ({
        id: `r-${index}`,
        reason: 'r',
      })),
    });

    expect(parsed).toEqual({ error: expect.any(String) });
  });
});
