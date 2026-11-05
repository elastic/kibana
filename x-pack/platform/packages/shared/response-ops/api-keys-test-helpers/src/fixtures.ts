/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeys } from '@kbn/response-ops-api-keys';
import { encodeApiKey } from '@kbn/response-ops-api-keys';

const es = { id: 'es-key-id', encoded: encodeApiKey('es-key-id', 'es-key-secret') };
const uiam = { id: 'uiam-key-id', secret: 'essu_uiam-key-secret', external: false };
const userUiam = { secret: 'essu_user-key-secret', external: false };

/** Every shape of {@link ApiKeys} a plugin can be asked to store. */
export const apiKeyFixtures = {
  'granted ES key': { createdByUser: false, es },
  'granted ES and UIAM keys': { createdByUser: false, es, uiam },
  'granted UIAM key': { createdByUser: false, uiam },
  'reused ES key': { createdByUser: true, es },
  'reused UIAM key with an id': { createdByUser: true, uiam },
  'reused raw UIAM key': { createdByUser: true, uiam: userUiam },
  'reused raw external UIAM key': { createdByUser: true, uiam: { ...userUiam, external: true } },
} satisfies Record<string, ApiKeys>;

export type ApiKeyFixtureName = keyof typeof apiKeyFixtures;
