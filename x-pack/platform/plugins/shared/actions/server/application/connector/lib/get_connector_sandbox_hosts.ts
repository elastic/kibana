/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '../../../types';

// Hosts the sandbox credential proxy accepts: lowercase letters, digits, '.' and '-', not at
// either end, at most 253 characters. It rejects the whole command for any other entry, such
// as an IPv6 literal or '_', and treats '*' as any host, so those entries are dropped here.
const SANDBOX_HOST_PATTERN = /^(?![.-])[a-z0-9.-]{1,253}(?<![.-])$/;

/** The connector's sandbox hosts the credential proxy accepts, lowercased and deduplicated. */
export const getConnectorSandboxHosts = ({
  actionType,
  config,
}: {
  actionType: Pick<ActionType, 'getSandboxHosts'>;
  config?: Record<string, unknown>;
}): string[] => [
  ...new Set(
    (actionType.getSandboxHosts?.({ config: config ?? {} }) ?? [])
      .map((host) => host.trim().toLowerCase())
      .filter((host) => SANDBOX_HOST_PATTERN.test(host))
  ),
];
