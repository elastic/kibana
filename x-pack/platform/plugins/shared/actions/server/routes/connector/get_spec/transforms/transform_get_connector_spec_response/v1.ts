/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorMetadata } from '@kbn/connector-specs';
import type { GetConnectorSpecResponseV1 } from '../../../../../../common/routes/connector/response';

export interface GetConnectorSpecServiceResult {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  isTestable: boolean;
  actions: Record<
    string,
    {
      description?: string;
      isTool?: boolean;
      input: Record<string, unknown>;
    }
  >;
  events?: {
    definitions: Array<{
      eventId: string;
      title: string;
      description: string;
      eventSchema: Record<string, unknown>;
    }>;
  };
}

const transformActions = (actions: GetConnectorSpecServiceResult['actions']) =>
  Object.fromEntries(
    Object.entries(actions).map(([name, action]) => [
      name,
      {
        ...(action.description !== undefined ? { description: action.description } : {}),
        ...(action.isTool !== undefined ? { is_tool: action.isTool } : {}),
        input: action.input,
      },
    ])
  );

export const transformGetConnectorSpecResponse = (
  spec: GetConnectorSpecServiceResult
): GetConnectorSpecResponseV1 => ({
  metadata: {
    id: spec.metadata.id,
    display_name: spec.metadata.displayName,
    description: spec.metadata.description,
    minimum_license: spec.metadata.minimumLicense as string,
    supported_feature_ids: spec.metadata.supportedFeatureIds ?? [],
    ...(spec.metadata.icon !== undefined ? { icon: spec.metadata.icon } : {}),
    ...(spec.metadata.docsUrl !== undefined ? { docs_url: spec.metadata.docsUrl } : {}),
    ...(spec.metadata.isTechnicalPreview !== undefined
      ? { is_technical_preview: spec.metadata.isTechnicalPreview }
      : {}),
  },
  schema: spec.schema,
  is_testable: spec.isTestable,
  actions: transformActions(spec.actions ?? {}),
  ...(spec.events
    ? {
        events: {
          definitions: spec.events.definitions.map((definition) => ({
            event_id: definition.eventId,
            title: definition.title,
            description: definition.description,
            event_schema: definition.eventSchema,
          })),
        },
      }
    : {}),
});
