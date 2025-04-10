/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { streamQuerySchema, type StreamQuery } from '../base/api';
import {
  GroupBase,
  groupBaseSchema,
  GroupStreamDefinitionBase,
  groupStreamDefinitionBaseSchema,
} from './base';

/**
 * Group get response
 */
interface GroupStreamGetResponse {
  dashboards: string[];
  queries: StreamQuery[];
  stream: GroupStreamDefinitionBase;
}

const groupStreamGetResponseSchema: z.Schema<GroupStreamGetResponse> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: groupStreamDefinitionBaseSchema,
});

/**
 * Group object get response
 */

interface GroupObjectGetResponse {
  group: GroupBase;
}

type GroupObjectUpsertRequest = GroupObjectGetResponse;

const groupObjectUpsertRequestSchema = z.object({
  group: groupBaseSchema,
});

/**
 * Group upsert request
 */
interface GroupStreamUpsertRequest {
  dashboards: string[];
  queries: StreamQuery[];
  stream: GroupStreamDefinitionBase;
}

const groupStreamUpsertRequestSchema: z.Schema<GroupStreamUpsertRequest> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: groupStreamDefinitionBaseSchema,
});

export {
  groupObjectUpsertRequestSchema,
  groupStreamGetResponseSchema,
  groupStreamUpsertRequestSchema,
  type GroupObjectGetResponse,
  type GroupObjectUpsertRequest,
  type GroupStreamGetResponse,
  type GroupStreamUpsertRequest,
};
