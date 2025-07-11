/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDescriptorWithSchema, ToolDescriptor } from '@kbn/onechat-common';

export interface ListToolsResponse {
  results: ToolDescriptorWithSchema[];
}

export type GetToolResponse = ToolDescriptorWithSchema;

export interface DeleteToolResponse {
  success: boolean;
}

export type CreateToolPayload = Omit<ToolDescriptor, 'type'> &
  Partial<Pick<ToolDescriptor, 'type'>>;

export type UpdateToolPayload = Partial<Pick<ToolDescriptor, 'description' | 'tags'>> & {
  configuration?: Partial<ToolDescriptor['configuration']>;
};

export type CreateToolResponse = ToolDescriptorWithSchema;

export type UpdateToolResponse = ToolDescriptorWithSchema;
