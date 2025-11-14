/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type {
  NotionConfigSchema,
  NotionSecretsSchema,
  NotionSearchActionParamsSchema,
  NotionGetDataSourceActionParamsSchema,
  NotionGetPageActionParamsSchema,
  NotionQueryActionParamsSchema,
  NotionGetDataSourceActionResponseSchema,
} from './schema';

export type NotionConfig = z.infer<typeof NotionConfigSchema>;
export type NotionSecrets = z.infer<typeof NotionSecretsSchema>;

export type NotionConnectorType = SubActionConnectorType<NotionConfig, NotionSecrets>;

export type NotionSearchActionParams = z.infer<typeof NotionSearchActionParamsSchema>;

export type NotionGetPageActionParams = z.infer<typeof NotionGetPageActionParamsSchema>;

export type NotionGetDataSourceActionParams = z.infer<typeof NotionGetDataSourceActionParamsSchema>;
export type NotionGetDataSourceActionResponse = z.infer<
  typeof NotionGetDataSourceActionResponseSchema
>;

export type NotionQueryActionParams = z.infer<typeof NotionQueryActionParamsSchema>;
