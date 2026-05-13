/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExternalServiceSchema } from '../../domain_zod/external_service/v1';
import { CaseConnectorSchema, ConnectorMappingsSchema } from '../../domain_zod/connector/v1';

const PushDetailsSchema = z.object({
  latestUserActionPushDate: z.string(),
  oldestUserActionPushDate: z.string(),
  externalService: ExternalServiceSchema,
});

const CaseConnectorPushInfoSchema = z.object({
  needsToBePushed: z.boolean(),
  hasBeenPushed: z.boolean(),
  details: PushDetailsSchema.optional(),
});

export const GetCaseConnectorsResponseSchema = z.record(
  z.string(),
  CaseConnectorSchema.and(z.object({ push: CaseConnectorPushInfoSchema }))
);

const ActionConnectorResultSchema = z.object({
  id: z.string(),
  actionTypeId: z.string(),
  name: z.string(),
  isDeprecated: z.boolean(),
  isPreconfigured: z.boolean(),
  isSystemAction: z.boolean(),
  referencedByCount: z.number(),
  isConnectorTypeDeprecated: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
  isMissingSecrets: z.boolean().optional(),
});

export const FindActionConnectorResponseSchema = z.array(ActionConnectorResultSchema);

export const ConnectorMappingResponseSchema = z.object({
  id: z.string(),
  version: z.string(),
  mappings: ConnectorMappingsSchema,
});

export type ConnectorMappingResponse = z.infer<typeof ConnectorMappingResponseSchema>;
export type GetCaseConnectorsResponse = z.infer<typeof GetCaseConnectorsResponseSchema>;
