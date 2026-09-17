/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecCatalogEntry } from '@kbn/connector-specs/src/lib/serialize_connector_spec_catalog';
import type { GetConnectorSpecsResponseV1 } from '../../../../../../common/routes/connector/response';

const transformCatalogEntry = (entry: ConnectorSpecCatalogEntry) => ({
  id: entry.id,
  metadata: {
    id: entry.metadata.id,
    display_name: entry.metadata.displayName,
    description: entry.metadata.description,
    minimum_license: entry.metadata.minimumLicense as string,
    supported_feature_ids: entry.metadata.supportedFeatureIds ?? [],
    ...(entry.metadata.icon !== undefined ? { icon: entry.metadata.icon } : {}),
    ...(entry.metadata.docsUrl !== undefined ? { docs_url: entry.metadata.docsUrl } : {}),
    ...(entry.metadata.isTechnicalPreview !== undefined
      ? { is_technical_preview: entry.metadata.isTechnicalPreview }
      : {}),
  },
  is_inbound_only: entry.isInboundOnly,
  actions: Object.fromEntries(
    Object.entries(entry.actions).map(([name, action]) => [
      name,
      {
        ...(action.description !== undefined ? { description: action.description } : {}),
        ...(action.isTool !== undefined ? { is_tool: action.isTool } : {}),
        input_json_schema: action.inputJsonSchema,
      },
    ])
  ),
  ...(entry.events
    ? {
        events: {
          definitions: entry.events.definitions.map((definition) => ({
            event_id: definition.eventId,
            title: definition.title,
            description: definition.description,
            event_json_schema: definition.eventJsonSchema,
          })),
        },
      }
    : {}),
});

export const transformGetConnectorSpecsResponse = (result: {
  specs: ConnectorSpecCatalogEntry[];
}): GetConnectorSpecsResponseV1 => ({
  specs: result.specs.map(transformCatalogEntry),
});
