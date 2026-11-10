/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSupportedCatalogueSchemaVersion,
  type CatalogueComponentDefinition,
  type ComponentCatalogue,
} from '@kbn/streams-schema';

/** Whether this Kibana can render forms from the catalogue's document shape at all. */
export const isCatalogueSupported = ({ schema_version: version, metadata }: ComponentCatalogue) =>
  isSupportedCatalogueSchemaVersion(version) &&
  isSupportedCatalogueSchemaVersion(metadata.schema_version);

// The streams-api-driven-components schema asks hosts to reject a limit that `fixed` contradicts or
// that the supported signals cannot reach.
const hasValidTelemetryLimit = ({
  telemetry_selection: selection,
  supported_telemetry: supported,
  max_selected_telemetry: limit,
}: CatalogueComponentDefinition) =>
  limit === undefined ||
  (selection === 'configurable' &&
    Number.isInteger(limit) &&
    limit >= 1 &&
    limit <= supported.length);

/** Whether Kibana can render and edit a component from its definition. */
export const isDefinitionUsable = (definition: CatalogueComponentDefinition) =>
  isSupportedCatalogueSchemaVersion(definition.schema_version) &&
  hasValidTelemetryLimit(definition);

/**
 * The catalogue narrowed to the components Kibana can edit, or `undefined` when its document shape
 * is one this Kibana does not know, so nothing in it can be edited.
 */
export const toEditableCatalogue = (
  catalogue: ComponentCatalogue
): ComponentCatalogue | undefined => {
  if (!isCatalogueSupported(catalogue)) {
    return undefined;
  }
  const definitions = catalogue.definitions.filter(isDefinitionUsable);
  const usable = new Set(definitions.map(({ kind, type }) => `${kind}:${type}`));
  return {
    ...catalogue,
    components: catalogue.components.filter(({ kind, type }) => usable.has(`${kind}:${type}`)),
    definitions,
  };
};
