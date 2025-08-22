/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorToolConfig, ToolType } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import type { ToolPersistedDefinition } from '../../client';
import { InternalToolDefinition } from '../../tool_provider';

export function toToolDefinition<
  TSchema extends z.ZodObject<any> = z.ZodObject<any>,
  TResult = unknown
>(
  connectorTool: ToolPersistedDefinition<ConnectorToolConfig>,
  schema: TSchema
): InternalToolDefinition<ConnectorToolConfig, TSchema, TResult> {
  const { id, description, tags, configuration } = connectorTool;

  return {
    id,
    type: ToolType.connector,
    description,
    tags,
    configuration,
    schema: schema as TSchema,
    handler: async (params, { actions, esClient }) => {
      const client = esClient.asCurrentUser;

      const subaction = configuration.sub_action;

      const result = await actions.execute({
        params: {
          subAction: subaction,
          subActionParams: params,
        },
        actionId: configuration.connector_id,
        relatedSavedObjects: [],
      });

      return {
        result: result.data as TResult,
      };
    },
  };
}
