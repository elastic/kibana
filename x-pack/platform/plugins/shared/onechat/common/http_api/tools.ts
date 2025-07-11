/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema, ToolDefinition } from '@kbn/onechat-common';

export interface ListToolsResponse {
  results: ToolDefinitionWithSchema[];
}

export type GetToolResponse = ToolDefinitionWithSchema;

export interface DeleteToolResponse {
  success: boolean;
}

export type CreateToolPayload = Omit<ToolDefinition, 'type'> &
  Partial<Pick<ToolDefinition, 'type'>>;

export type UpdateToolPayload = Partial<Pick<ToolDefinition, 'description' | 'tags'>> & {
  configuration?: Partial<ToolDefinition['configuration']>;
};

export type CreateToolResponse = ToolDefinitionWithSchema;

export type UpdateToolResponse = ToolDefinitionWithSchema;
