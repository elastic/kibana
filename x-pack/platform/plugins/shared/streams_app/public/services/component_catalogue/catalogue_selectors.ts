/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogueComponentDefinition,
  CatalogueComponentKind,
  CatalogueComponentSummary,
  CatalogueEnumField,
  CatalogueEnumOption,
  CatalogueMetadata,
  CataloguePathOption,
  CatalogueSignal,
  ComponentCatalogue,
} from '@kbn/streams-schema';

/** Catalogue entries without `supported_telemetry` apply to every signal. */
export const supportsAnySignal = (
  supported: readonly CatalogueSignal[] | undefined,
  telemetry: readonly CatalogueSignal[]
): boolean =>
  supported === undefined ||
  telemetry.length === 0 ||
  supported.some((signal) => telemetry.includes(signal));

export const listComponents = (
  catalogue: ComponentCatalogue,
  kind: CatalogueComponentKind
): CatalogueComponentSummary[] =>
  catalogue.components.filter((component) => component.kind === kind);

export const getDefinition = (
  catalogue: ComponentCatalogue,
  kind: CatalogueComponentKind,
  type: string
): CatalogueComponentDefinition | undefined =>
  catalogue.definitions.find((definition) => definition.kind === kind && definition.type === type);

export const resolveEnumOptions = (
  field: CatalogueEnumField,
  metadata: CatalogueMetadata,
  telemetry: readonly CatalogueSignal[]
): CatalogueEnumOption[] => {
  const options = field.options ?? metadata.enum_sets[field.enum_set ?? '']?.options ?? [];
  return options.filter((option) => supportsAnySignal(option.supported_telemetry, telemetry));
};

export interface PathScope {
  location?: string;
  context?: string;
}

/** Path suggestions for the location (or, without one, the OTTL context) chosen next to the path. */
export const resolvePathOptions = (
  metadata: CatalogueMetadata,
  pathSetId: string | undefined,
  { location, context }: PathScope,
  telemetry: readonly CatalogueSignal[]
): CataloguePathOption[] => {
  const pathSet = pathSetId ? metadata.path_sets[pathSetId] : undefined;
  if (!pathSet) {
    return [];
  }
  const candidates = location
    ? pathSet.locations[location]
    : context
    ? pathSet.contexts[context]
    : undefined;
  const seen = new Set<string>();
  return (candidates ?? []).filter((option) => {
    if (seen.has(option.path) || !supportsAnySignal(option.supported_telemetry, telemetry)) {
      return false;
    }
    seen.add(option.path);
    return true;
  });
};
