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

export const TestConnectorParamsSchema = schema.object({});

export const AgentDetailsParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

export const IsolateHostParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  comment: schema.string({ minLength: 1 }),
});

export const ReleaseHostParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  comment: schema.string({ minLength: 1 }),
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
});

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

export const MicrosoftDefenderEndpointActionParamsSchema = schema.oneOf([
  TestConnectorSchema,
  IsolateHostSchema,
  ReleaseHostSchema,
]);
