/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionType } from '../../../types';

// Hosts the sandbox credential proxy accepts: lowercase letters, digits, '.' and '-', not at
// either end, at most 253 characters. It rejects the whole command for any other entry, such
// as an IPv6 literal or '_', and treats '*' as any host, so those entries are dropped here.
const SANDBOX_HOST_PATTERN = /^(?![.-])[a-z0-9.-]{1,253}(?<![.-])$/;

// The credential proxy rejects a command whose secret lists more allowed hosts than this.
export const MAX_SANDBOX_HOSTS = 32;

/**
 * The connector's sandbox hosts the credential proxy accepts, lowercased, deduplicated and
 * capped at MAX_SANDBOX_HOSTS (with a warning). A getSandboxHosts hook that throws is logged
 * and treated as no hosts, so the connector fails closed without breaking sandbox use for
 * other connectors.
 */
export const getConnectorSandboxHosts = ({
  actionType,
  config,
  connectorId,
  logger,
}: {
  actionType: Pick<ActionType, 'id' | 'getSandboxHosts'>;
  config?: Record<string, unknown>;
  connectorId?: string;
  logger?: Logger;
}): string[] => {
  let hosts: readonly string[];
  try {
    hosts = actionType.getSandboxHosts?.({ config: config ?? {} }) ?? [];
  } catch (err) {
    logger?.warn(
      `Unable to resolve sandbox hosts for connector${connectorId ? ` "${connectorId}"` : ''} (${
        actionType.id
      }), treating it as having no sandbox hosts: ${err instanceof Error ? err.message : err}`
    );
    return [];
  }
  const validHosts = [
    ...new Set(
      hosts
        .filter((host): host is string => typeof host === 'string')
        .map((host) => host.trim().toLowerCase())
        .filter((host) => SANDBOX_HOST_PATTERN.test(host))
    ),
  ];
  if (validHosts.length > MAX_SANDBOX_HOSTS) {
    logger?.warn(
      `Connector${connectorId ? ` "${connectorId}"` : ''} (${actionType.id}) has ${
        validHosts.length
      } sandbox hosts; only the first ${MAX_SANDBOX_HOSTS} are used, because the sandbox credential proxy accepts at most ${MAX_SANDBOX_HOSTS}`
    );
    return validHosts.slice(0, MAX_SANDBOX_HOSTS);
  }
  return validHosts;
};
