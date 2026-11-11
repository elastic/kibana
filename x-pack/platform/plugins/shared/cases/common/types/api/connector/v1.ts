/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ExternalServiceSchema } from '../../domain/external_service/v1';
import { CaseConnectorSchema, ConnectorMappingsSchema } from '../../domain/connector/v1';

const PushDetailsSchema = lazySchema(() =>
  z.object({
    latestUserActionPushDate: z.string().max(50),
    oldestUserActionPushDate: z.string().max(50),
    externalService: ExternalServiceSchema,
  })
);

const CaseConnectorPushInfoSchema = lazySchema(() =>
  z.object({
    needsToBePushed: z.boolean(),
    hasBeenPushed: z.boolean(),
    details: PushDetailsSchema.optional(),
  })
);

export const GetCaseConnectorsResponseSchema = lazySchema(() =>
  z.record(
    z.string().max(512),
    CaseConnectorSchema.and(z.object({ push: CaseConnectorPushInfoSchema }))
  )
);

const ActionConnectorResultSchema = lazySchema(() =>
  z.object({
    id: z.string().max(512),
    actionTypeId: z.string().max(256),
    name: z.string(),
    isDeprecated: z.boolean(),
    isPreconfigured: z.boolean(),
    isSystemAction: z.boolean(),
    referencedByCount: z.number(),
    isConnectorTypeDeprecated: z.boolean(),
    config: z.record(z.string().max(256), z.unknown()).optional(),
    isMissingSecrets: z.boolean().optional(),
  })
);

export const FindActionConnectorResponseSchema = lazySchema(() =>
  z.array(ActionConnectorResultSchema)
);

export const ConnectorMappingResponseSchema = lazySchema(() =>
  z.object({
    id: z.string().max(512),
    version: z.string().max(512),
    mappings: ConnectorMappingsSchema,
  })
);

export type ConnectorMappingResponse = z.infer<typeof ConnectorMappingResponseSchema>;
export type GetCaseConnectorsResponse = z.infer<typeof GetCaseConnectorsResponseSchema>;
export type GetCaseConnectorsPushDetails = z.infer<typeof PushDetailsSchema>;
