/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountPlatformAssumer } from '@kbn/core-security-server';

/**
 * The platform services a plugin may name as an assumer, keyed by the name callers use. Each value
 * is the id of that service's own UIAM service account. Keyed by the Core type, so a name added in
 * Core fails the type check until it is mapped here.
 *
 * UIAM lets a platform service assume any account that names it, in any project. So only add a
 * service that checks, before every exchange, that the account belongs to the project asking for it.
 */
const PLATFORM_ASSUMER_SERVICE_ACCOUNT_IDS: Readonly<
  Record<ServiceAccountPlatformAssumer, string>
> = {
  relay: 'relay-service',
  sandbox: 'sandbox-api',
};

/** Every name a caller may pass in `platformAssumers`. */
export const PLATFORM_ASSUMERS = Object.keys(PLATFORM_ASSUMER_SERVICE_ACCOUNT_IDS) as [
  ServiceAccountPlatformAssumer,
  ...ServiceAccountPlatformAssumer[]
];

/** Maps validated assumer names to the ids UIAM expects in `assumable_by`. */
export const getPlatformAssumerServiceAccountIds = (
  assumers: readonly ServiceAccountPlatformAssumer[]
): string[] => assumers.map((assumer) => PLATFORM_ASSUMER_SERVICE_ACCOUNT_IDS[assumer]);
