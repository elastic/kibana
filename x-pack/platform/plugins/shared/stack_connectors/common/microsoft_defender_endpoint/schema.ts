/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from './constants';

// ----------------------------------
// Connector setup schemas
// ----------------------------------
export const MicrosoftDefenderEndpointConfigSchema = schema.object({
  clientId: schema.string({ minLength: 1 }),
  tenantId: schema.string({ minLength: 1 }),
  oAuthServerUrl: schema.string({ minLength: 1 }),
  oAuthScope: schema.string({ minLength: 1 }),
  apiUrl: schema.string({ minLength: 1 }),
});
export const MicrosoftDefenderEndpointSecretsSchema = schema.object({
  clientSecret: schema.string({ minLength: 1 }),
});

// ----------------------------------
// Connector Methods
// ----------------------------------
export const MicrosoftDefenderEndpointDoNotValidateResponseSchema = schema.any();

export const MicrosoftDefenderEndpointBaseApiResponseSchema = schema.maybe(
  schema.object({}, { unknowns: 'allow' })
);

export const MicrosoftDefenderEndpointEmptyParamsSchema = schema.object({});

export const TestConnectorParamsSchema = schema.object({});

export const AgentDetailsParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

const MachineHealthStatusSchema = schema.oneOf([
  schema.literal('Active'),
  schema.literal('Inactive'),
  schema.literal('ImpairedCommunication'),
  schema.literal('NoSensorData'),
  schema.literal('NoSensorDataImpairedCommunication'),
  schema.literal('Unknown'),
]);

export const AgentListParamsSchema = schema.object({
  computerDnsName: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  id: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  version: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  deviceValue: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  aaDeviceId: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  machineTags: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  lastSeen: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  exposureLevel: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  onboardingStatus: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  lastIpAddress: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  healthStatus: schema.maybe(
    schema.oneOf([
      MachineHealthStatusSchema,
      schema.arrayOf(MachineHealthStatusSchema, { minSize: 1 }),
    ])
  ),
  osPlatform: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  riskScore: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  rbacGroupId: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),

  page: schema.maybe(schema.number({ min: 1, defaultValue: 1 })),
  pageSize: schema.maybe(schema.number({ min: 1, max: 1000, defaultValue: 20 })),
});

export const IsolateHostParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  comment: schema.string({ minLength: 1 }),
});

export const ReleaseHostParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  comment: schema.string({ minLength: 1 }),
});

export const RunScriptParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  comment: schema.maybe(schema.string({ minLength: 1 })),
  parameters: schema.object({
    scriptName: schema.string({ minLength: 1 }),
    args: schema.maybe(schema.string({ minLength: 1 })),
  }),
});

const MachineActionTypeSchema = schema.oneOf([
  schema.literal('RunAntiVirusScan'),
  schema.literal('Offboard'),
  schema.literal('LiveResponse'),
  schema.literal('CollectInvestigationPackage'),
  schema.literal('Isolate'),
  schema.literal('Unisolate'),
  schema.literal('StopAndQuarantineFile'),
  schema.literal('RestrictCodeExecution'),
  schema.literal('UnrestrictCodeExecution'),
]);

const MachineActionStatusSchema = schema.oneOf([
  schema.literal('Pending'),
  schema.literal('InProgress'),
  schema.literal('Succeeded'),
  schema.literal('Failed'),
  schema.literal('TimeOut'),
  schema.literal('Cancelled'),
]);

export const GetActionsParamsSchema = schema.object({
  id: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  status: schema.maybe(
    schema.oneOf([
      MachineActionStatusSchema,
      schema.arrayOf(MachineActionStatusSchema, { minSize: 1 }),
    ])
  ),
  machineId: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  type: schema.maybe(
    schema.oneOf([MachineActionTypeSchema, schema.arrayOf(MachineActionTypeSchema, { minSize: 1 })])
  ),
  requestor: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  creationDateTimeUtc: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ])
  ),
  page: schema.maybe(schema.number({ min: 1, defaultValue: 1 })),
  pageSize: schema.maybe(schema.number({ min: 1, max: 1000, defaultValue: 20 })),
  sortField: schema.maybe(schema.string({ minLength: 1 })),
  sortDirection: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
});

export const GetActionResultsParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

export const MSDefenderLibraryFileSchema = schema.object(
  {
    fileName: schema.maybe(schema.string()),
    sha256: schema.maybe(schema.string()),
    description: schema.maybe(schema.string()),
    creationTime: schema.maybe(schema.string()),
    lastUpdatedTime: schema.maybe(schema.string()),
    createdBy: schema.maybe(schema.string()),
    hasParameters: schema.maybe(schema.boolean()),
    parametersDescription: schema.maybe(schema.nullable(schema.string())),
  },
  { unknowns: 'allow' }
);

export const GetLibraryFilesResponse = schema.object(
  {
    '@odata.context': schema.maybe(schema.string()),
    value: schema.maybe(schema.arrayOf(MSDefenderLibraryFileSchema)),
  },
  { unknowns: 'allow' }
);

export const DownloadActionResultsResponseSchema = schema.stream();

// ----------------------------------
// Connector Sub-Actions
// ----------------------------------

const TestConnectorSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR),
  subActionParams: TestConnectorParamsSchema,
});

const IsolateHostSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST),
  subActionParams: IsolateHostParamsSchema,
});

const ReleaseHostSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST),
  subActionParams: ReleaseHostParamsSchema,
});
const RunScriptSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT),
  subActionParams: RunScriptParamsSchema,
});

export const MicrosoftDefenderEndpointActionParamsSchema = schema.oneOf([
  TestConnectorSchema,
  IsolateHostSchema,
  ReleaseHostSchema,
  RunScriptSchema,
]);
