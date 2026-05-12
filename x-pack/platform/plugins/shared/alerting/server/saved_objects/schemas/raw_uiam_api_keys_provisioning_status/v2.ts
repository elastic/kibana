/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawUiamApiKeysProvisioningStatusSchema as rawUiamApiKeysProvisioningStatusSchemaV1 } from './v1';

export const rawUiamApiKeysProvisioningStatusSchema =
  rawUiamApiKeysProvisioningStatusSchemaV1.extends({
    errorCode: schema.maybe(schema.string()),
  });
