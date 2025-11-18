/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from './constants';

// ----------------------------------
// Connector setup schemas
// ----------------------------------
export const MicrosoftDefenderEndpointConfigSchema = z
  .object({
    clientId: z.string().min(1),
    tenantId: z.string().min(1),
    oAuthServerUrl: z.string().min(1),
    oAuthScope: z.string().min(1),
    apiUrl: z.string().min(1),
  })
  .strict();
export const MicrosoftDefenderEndpointSecretsSchema = z
  .object({
    clientSecret: z.string().min(1),
  })
  .strict();

// ----------------------------------
// Connector Methods
// ----------------------------------
export const MicrosoftDefenderEndpointDoNotValidateResponseSchema = z.any();

export const MicrosoftDefenderEndpointBaseApiResponseSchema = z.object({}).passthrough().optional();

export const MicrosoftDefenderEndpointEmptyParamsSchema = z.object({}).strict();

export const TestConnectorParamsSchema = z.object({}).strict();

export const AgentDetailsParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

const MachineHealthStatusSchema = z.enum([
  'Active',
  'Inactive',
  'ImpairedCommunication',
  'NoSensorData',
  'NoSensorDataImpairedCommunication',
  'Unknown',
]);

export const AgentListParamsSchema = z
  .object({
    computerDnsName: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    id: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    version: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    deviceValue: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    aaDeviceId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    machineTags: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    lastSeen: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    exposureLevel: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    onboardingStatus: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    lastIpAddress: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    healthStatus: z
      .union([MachineHealthStatusSchema, z.array(MachineHealthStatusSchema).min(1)])
      .optional(),
    osPlatform: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    riskScore: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    rbacGroupId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    page: z.coerce.number().min(1).default(1).optional(),
    pageSize: z.coerce.number().min(1).max(1000).default(20).optional(),
  })
  .strict();

export const IsolateHostParamsSchema = z
  .object({
    id: z.string().min(1),
    comment: z.string().min(1),
  })
  .strict();

export const ReleaseHostParamsSchema = z
  .object({
    id: z.string().min(1),
    comment: z.string().min(1),
  })
  .strict();

export const RunScriptParamsSchema = z
  .object({
    id: z.string().min(1),
    comment: z.string().min(1).optional(),
    parameters: z
      .object({
        scriptName: z.string().min(1),
        args: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

export const CancelParamsSchema = z
  .object({
    comment: z.string().min(1),
    actionId: z.string().min(1),
  })
  .strict();

const MachineActionTypeSchema = z.enum([
  'RunAntiVirusScan',
  'Offboard',
  'LiveResponse',
  'CollectInvestigationPackage',
  'Isolate',
  'Unisolate',
  'StopAndQuarantineFile',
  'RestrictCodeExecution',
  'UnrestrictCodeExecution',
]);

const MachineActionStatusSchema = z.enum([
  'Pending',
  'InProgress',
  'Succeeded',
  'Failed',
  'TimeOut',
  'Cancelled',
]);

export const GetActionsParamsSchema = z
  .object({
    id: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    status: z
      .union([MachineActionStatusSchema, z.array(MachineActionStatusSchema).min(1)])
      .optional(),
    machineId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    type: z.union([MachineActionTypeSchema, z.array(MachineActionTypeSchema).min(1)]).optional(),
    requestor: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    creationDateTimeUtc: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    page: z.coerce.number().min(1).default(1).optional(),
    pageSize: z.coerce.number().min(1).max(1000).default(20).optional(),
    sortField: z.string().min(1).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const GetActionResultsParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export const MSDefenderLibraryFileSchema = z
  .object({
    fileName: z.string().optional(),
    sha256: z.string().optional(),
    description: z.string().optional(),
    creationTime: z.string().optional(),
    lastUpdatedTime: z.string().optional(),
    createdBy: z.string().optional(),
    hasParameters: z.boolean().optional(),
    parametersDescription: z.string().nullish(),
  })
  .passthrough();

export const GetLibraryFilesResponse = z
  .object({
    '@odata.context': z.string().optional(),
    value: z.array(MSDefenderLibraryFileSchema).optional(),
  })
  .passthrough();

export const DownloadActionResultsResponseSchema = z.any();

// ----------------------------------
// Connector Sub-Actions
// ----------------------------------

const TestConnectorSchema = z
  .object({
    subAction: z.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR),
    subActionParams: TestConnectorParamsSchema,
  })
  .strict();

const IsolateHostSchema = z
  .object({
    subAction: z.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST),
    subActionParams: IsolateHostParamsSchema,
  })
  .strict();

const ReleaseHostSchema = z
  .object({
    subAction: z.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST),
    subActionParams: ReleaseHostParamsSchema,
  })
  .strict();
const RunScriptSchema = z
  .object({
    subAction: z.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT),
    subActionParams: RunScriptParamsSchema,
  })
  .strict();

export const MicrosoftDefenderEndpointActionParamsSchema = z.union([
  TestConnectorSchema,
  IsolateHostSchema,
  ReleaseHostSchema,
  RunScriptSchema,
]);
