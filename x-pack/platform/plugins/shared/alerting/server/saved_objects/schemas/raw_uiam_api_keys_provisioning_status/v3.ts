/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawUiamApiKeysProvisioningStatusSchema as rawUiamApiKeysProvisioningStatusSchemaV2 } from './v2';

export const rawUiamApiKeysProvisioningStatusSchema =
  rawUiamApiKeysProvisioningStatusSchemaV2.extends({
    // The Elasticsearch API key id the conversion this status describes was attempted for. Scopes
    // the verdict to a credential, so a rule that is re-saved — which re-mints its Elasticsearch key
    // under a new id — is judged afresh instead of staying suppressed by a record about a key it no
    // longer holds. Only the id, never the key itself, so this stays a plain saved object.
    apiKeyId: schema.maybe(schema.string()),
  });
