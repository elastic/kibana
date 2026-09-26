/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSOQueriesToPack, convertPackQueriesToSO, storedQueryVersion } from './utils';
import type { PackQueryFormData } from '../queries/use_pack_query_form';

const makeQuery = (overrides: Partial<PackQueryFormData>): PackQueryFormData =>
  ({
    id: 'query-1',
    query: 'SELECT 1;',
    interval: 3600,
    ecs_mapping: {},
    ...overrides,
  } as PackQueryFormData);

describe('pack form serializer (public) — convertSOQueriesToPack', () => {
  it('create payload carries NO per-query id (server derives it from the map key)', () => {
    const result = convertSOQueriesToPack([makeQuery({ id: 'processes' })]);

    expect(Object.keys(result)).toEqual(['processes']);
    expect(result.processes).not.toHaveProperty('id');
    expect(result.processes).toMatchObject({ query: 'SELECT 1;', interval: 3600 });
  });

  it('edit payload round-trips the stored id (originalId) as the identity claim', () => {
    const result = convertSOQueriesToPack(
      [makeQuery({ id: 'processes', originalId: 'processes' })],
      {
        includeId: true,
      }
    );

    expect(Object.keys(result)).toEqual(['processes']);
    expect(result.processes).toMatchObject({ id: 'processes', query: 'SELECT 1;' });
    // originalId is a form-only field — never sent to the server.
    expect(result.processes).not.toHaveProperty('originalId');
  });

  it('edit payload: a RENAMED query carries its ORIGINAL id, not the new name', () => {
    // originalId still holds the stored id after a rename; the server matches on it.
    const result = convertSOQueriesToPack([makeQuery({ id: 'renamed', originalId: 'processes' })], {
      includeId: true,
    });

    expect(Object.keys(result)).toEqual(['renamed']);
    expect(result.renamed).toMatchObject({ id: 'processes' });
  });

  it('edit payload: a brand-new query (no originalId) falls back to the map key', () => {
    const result = convertSOQueriesToPack([makeQuery({ id: 'brand_new' })], { includeId: true });

    expect(result.brand_new).toMatchObject({ id: 'brand_new' });
  });

  it('deserializer captures originalId; a rename then round-trips the original claim', () => {
    // GET delivers queries keyed by stored id; a rename must still round-trip that id.
    const stored = { processes: { query: 'SELECT 1;', interval: 3600, ecs_mapping: {} } };
    const asArray = convertPackQueriesToSO(stored);
    expect(asArray[0].id).toBe('processes');
    expect(asArray[0].originalId).toBe('processes');

    // Simulate a UI rename: id changes, originalId is preserved (as queries_field does).
    const renamed = [{ ...asArray[0], id: 'renamed' }];
    const backToRecord = convertSOQueriesToPack(renamed, { includeId: true });
    expect(Object.keys(backToRecord)).toEqual(['renamed']);
    expect(backToRecord.renamed).toMatchObject({ id: 'processes' });
  });

  it('serializes a form version array as a wire string', () => {
    const result = convertSOQueriesToPack([makeQuery({ id: 'processes', version: ['5.10.0'] })]);

    expect(result.processes.version).toBe('5.10.0');
  });

  it('deserializes a wire string version without treating it as a character array', () => {
    const stored = {
      processes: { query: 'SELECT 1;', interval: 3600, version: '5.10.0', ecs_mapping: {} },
    };
    const asArray = convertPackQueriesToSO(stored);
    expect(storedQueryVersion(asArray[0].version)).toBe('5.10.0');
  });
});

describe('storedQueryVersion', () => {
  it('returns a wire string unchanged', () => {
    expect(storedQueryVersion('5.10.0')).toBe('5.10.0');
  });

  it('returns the first form-array entry', () => {
    expect(storedQueryVersion(['5.12.0'])).toBe('5.12.0');
  });

  it('does not treat a string as a character array', () => {
    expect(storedQueryVersion('5.10.0')).not.toBe('5');
  });

  it('returns empty for missing values', () => {
    expect(storedQueryVersion(undefined)).toBe('');
    expect(storedQueryVersion([])).toBe('');
  });
});
