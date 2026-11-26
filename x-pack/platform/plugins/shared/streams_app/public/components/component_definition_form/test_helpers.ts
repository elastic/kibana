/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogueComponentDefinition,
  CatalogueComponentKind,
  CatalogueObjectField,
  ComponentCatalogue,
} from '@kbn/streams-schema';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';

export const testCatalogue = fixture as ComponentCatalogue;

/** A definition of the catalogue fixture. */
export const definitionOf = (
  type: string,
  kind: CatalogueComponentKind = 'processor'
): CatalogueComponentDefinition => {
  const definition = testCatalogue.definitions.find(
    (candidate) => candidate.kind === kind && candidate.type === type
  );
  if (!definition) {
    throw new Error(`${kind} ${type} is missing from the catalogue fixture`);
  }
  return definition;
};

/** The object each item of a definition's list is, such as an operation of `set`. */
export const itemFieldOf = (
  definition: CatalogueComponentDefinition,
  listName: string
): CatalogueObjectField => {
  const list = definition.fields.find(({ name }) => name === listName);
  if (list?.type !== 'array' || list.items.type !== 'object') {
    throw new Error(`${definition.type} has no list of objects named ${listName}`);
  }
  return list.items;
};

/** Replaces the definition and summary of one component of a catalogue. */
export const withDefinition = (
  catalogue: ComponentCatalogue,
  definition: CatalogueComponentDefinition
): ComponentCatalogue => {
  const isTarget = ({ kind, type }: { kind: CatalogueComponentKind; type: string }) =>
    kind === definition.kind && type === definition.type;
  return {
    ...catalogue,
    components: catalogue.components.map((component) =>
      isTarget(component)
        ? {
            ...component,
            telemetry_selection: definition.telemetry_selection,
            supported_telemetry: definition.supported_telemetry,
          }
        : component
    ),
    definitions: catalogue.definitions.map((candidate) =>
      isTarget(candidate) ? definition : candidate
    ),
  };
};

/** The fixture with a single processor, which an editor for a new processor preselects. */
export const singleProcessorCatalogue = (type: string): ComponentCatalogue => {
  const isKept = (component: { kind: CatalogueComponentKind; type: string }) =>
    component.kind !== 'processor' || component.type === type;
  return {
    ...testCatalogue,
    components: testCatalogue.components.filter(isKept),
    definitions: testCatalogue.definitions.filter(isKept),
  };
};

/**
 * Lets the items of the definition's object lists carry their own telemetry scope. The schema
 * allows it, but no component of the fixture declares it.
 */
export const withItemTelemetry = (
  definition: CatalogueComponentDefinition
): CatalogueComponentDefinition => ({
  ...definition,
  fields: definition.fields.map((field) =>
    field.type === 'array' && field.items.type === 'object'
      ? { ...field, items: { ...field.items, telemetry_selection: 'configurable' as const } }
      : field
  ),
});
