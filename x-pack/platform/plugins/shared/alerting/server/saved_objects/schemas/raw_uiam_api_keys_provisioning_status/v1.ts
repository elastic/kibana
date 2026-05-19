/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '@kbn/uiam-api-keys-provisioning-status';

const entityType = schema.oneOf([
  schema.literal(UiamApiKeyProvisioningEntityType.RULE),
  schema.literal(UiamApiKeyProvisioningEntityType.TASK),
]);
const status = schema.oneOf([
  schema.literal(UiamApiKeyProvisioningStatus.COMPLETED),
  schema.literal(UiamApiKeyProvisioningStatus.FAILED),
  schema.literal(UiamApiKeyProvisioningStatus.SKIPPED),
]);

export const rawUiamApiKeysProvisioningStatusSchema = schema.object({
  '@timestamp': schema.string(),
  entityId: schema.string(),
  entityType,
  status,
  message: schema.maybe(schema.string()),
});
