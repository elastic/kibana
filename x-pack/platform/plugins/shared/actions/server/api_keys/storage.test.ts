/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeApiKeyStorage } from '@kbn/response-ops-api-keys-test-helpers';
import { connectorEventIdentityStorage } from './storage';

const NEVER_REUSES = "never reuses the caller's key";

describeApiKeyStorage('actions', connectorEventIdentityStorage, {
  unsupported: {
    'reused ES key': NEVER_REUSES,
    'reused UIAM key with an id': NEVER_REUSES,
    'reused raw UIAM key': NEVER_REUSES,
    'reused raw external UIAM key': NEVER_REUSES,
  },
});
