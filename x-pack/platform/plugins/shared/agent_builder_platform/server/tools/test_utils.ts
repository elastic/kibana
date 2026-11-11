/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  DynamicSchemaBuiltinToolDefinition,
  ToolSchemaContext,
} from '@kbn/agent-builder-server';

export const createSchemaContext = (includeFrozenByDefault: boolean): ToolSchemaContext => {
  const uiSettings = uiSettingsServiceMock.createClient();
  uiSettings.get.mockImplementation(async (key: string) =>
    key === AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID ? includeFrozenByDefault : undefined
  );
  return {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    uiSettings,
  };
};

export const resolveToolSchema = async <TSchema extends ZodObject<any>>(
  tool: DynamicSchemaBuiltinToolDefinition<TSchema>,
  includeFrozenByDefault: boolean
): Promise<TSchema> => tool.getSchema(createSchemaContext(includeFrozenByDefault));
