/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueEnumField, ComponentCatalogue } from '@kbn/streams-schema';
import fixture from './catalogue_snapshot/components_v1.json';
import {
  getDefinition,
  listComponents,
  resolveEnumOptions,
  resolvePathOptions,
  supportsAnySignal,
} from './catalogue_selectors';

const catalogue = fixture as ComponentCatalogue;

describe('catalogue selectors', () => {
  it('lists components by kind', () => {
    expect(listComponents(catalogue, 'processor').map(({ type }) => type)).toEqual(['add_fields']);
  });

  it('finds a definition by kind and type', () => {
    expect(getDefinition(catalogue, 'processor', 'add_fields')?.display_name).toBe('Add fields');
    expect(getDefinition(catalogue, 'destination', 'add_fields')).toBeUndefined();
  });

  it('filters enum set options by telemetry', () => {
    const field: CatalogueEnumField = { type: 'enum', name: 'context', enum_set: 'ottl.contexts' };
    const values = resolveEnumOptions(field, catalogue.metadata, ['traces']).map(
      ({ value }) => value
    );
    expect(values).toEqual(['resource', 'scope', 'span', 'spanevent']);
  });

  it('keeps inline enum options', () => {
    const field: CatalogueEnumField = {
      type: 'enum',
      name: 'action',
      options: [{ value: 'upsert' }, { value: 'delete' }],
    };
    expect(resolveEnumOptions(field, catalogue.metadata, ['logs'])).toHaveLength(2);
  });

  it('resolves path options from the chosen location', () => {
    const paths = resolvePathOptions(catalogue.metadata, 'ottl.paths', { location: 'record' }, [
      'logs',
    ]).map(({ path }) => path);
    expect(paths).toContain('event_name');
    expect(paths).not.toContain('name');
  });

  it('falls back to the OTTL context when no location is set', () => {
    const paths = resolvePathOptions(catalogue.metadata, 'ottl.paths', { context: 'span' }, [
      'traces',
    ]);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('returns no paths for an unknown path set', () => {
    expect(resolvePathOptions(catalogue.metadata, 'nope', { location: 'record' }, [])).toEqual([]);
  });

  it('treats entries without supported_telemetry as universal', () => {
    expect(supportsAnySignal(undefined, ['logs'])).toBe(true);
    expect(supportsAnySignal(['traces'], ['logs'])).toBe(false);
  });
});
