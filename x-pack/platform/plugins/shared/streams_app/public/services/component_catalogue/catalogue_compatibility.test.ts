/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueComponentDefinition, ComponentCatalogue } from '@kbn/streams-schema';
import fixture from './catalogue_snapshot/components_v1.json';
import { isDefinitionUsable, toEditableCatalogue } from './catalogue_compatibility';

const catalogue = fixture as ComponentCatalogue;

const addFields = (): CatalogueComponentDefinition => {
  const definition = catalogue.definitions.find(({ type }) => type === 'add_fields');
  if (!definition) {
    throw new Error('Expected add_fields in the catalogue fixture');
  }
  return definition;
};

describe('toEditableCatalogue', () => {
  it('keeps a supported catalogue whole', () => {
    expect(toEditableCatalogue(catalogue)).toEqual(catalogue);
  });

  it.each([
    ['the document', { ...catalogue, schema_version: 'v2' }],
    ['the metadata', { ...catalogue, metadata: { ...catalogue.metadata, schema_version: 'v2' } }],
  ])('rejects a catalogue whose %s shape is unsupported', (_, unsupported) => {
    expect(toEditableCatalogue(unsupported)).toBeUndefined();
  });

  it('drops only the components whose own definition is unsupported', () => {
    const editable = toEditableCatalogue({
      ...catalogue,
      definitions: catalogue.definitions.map((definition) =>
        definition.type === 'add_fields' ? { ...definition, schema_version: 'v2' } : definition
      ),
    });

    expect(editable?.components.map(({ type }) => type)).not.toContain('add_fields');
    expect(editable?.definitions.map(({ type }) => type)).not.toContain('add_fields');
    expect(editable?.components.length).toBe(catalogue.components.length - 1);
  });
});

describe('isDefinitionUsable', () => {
  it('accepts a telemetry limit within the supported signals', () => {
    expect(isDefinitionUsable({ ...addFields(), max_selected_telemetry: 1 })).toBe(true);
  });

  it.each([
    [
      'combined with fixed telemetry',
      { telemetry_selection: 'fixed' as const, max_selected_telemetry: 1 },
    ],
    ['below one', { max_selected_telemetry: 0 }],
    [
      'above the supported signals',
      { supported_telemetry: ['logs' as const], max_selected_telemetry: 2 },
    ],
  ])('rejects a telemetry limit %s', (_, overrides) => {
    expect(isDefinitionUsable({ ...addFields(), ...overrides })).toBe(false);
  });
});
