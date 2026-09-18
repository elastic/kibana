/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { upgradeConnectorParamsSchema, upgradeConnectorBodySchema } from './schemas/latest';
export type { UpgradeConnectorParams, UpgradeConnectorBody } from './types/latest';

export {
  upgradeConnectorParamsSchema as upgradeConnectorParamsSchemaV1,
  upgradeConnectorBodySchema as upgradeConnectorBodySchemaV1,
} from './schemas/v1';
export type {
  UpgradeConnectorParams as UpgradeConnectorParamsV1,
  UpgradeConnectorBody as UpgradeConnectorBodyV1,
} from './types/v1';
