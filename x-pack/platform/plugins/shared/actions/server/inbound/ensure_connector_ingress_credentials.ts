/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'node:crypto';

import { getConnectorSpec, isInboundOnlyConnectorSpec } from '@kbn/connector-specs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { ActionsClientContext } from '../actions_client';
import { computeIngestTokenHash } from './compute_ingest_token_hash';

export const isInboundIngressConnectorType = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && isInboundOnlyConnectorSpec(spec);
};

export const resolveInboundEventsSpaceId = (context: ActionsClientContext): string =>
  context.spaceId ?? context.spaces?.getSpaceId(context.request) ?? DEFAULT_SPACE_ID;

export const generateIngestToken = (): string => randomBytes(32).toString('base64url');

const getStoredHash = (config: Record<string, unknown>): string | undefined => {
  const hash = config.ingestTokenHash;
  return typeof hash === 'string' && hash.length > 0 ? hash : undefined;
};

export interface EnsureConnectorIngressCredentialsParams {
  connectorId: string;
  spaceId: string;
  existingConfig: Record<string, unknown>;
  /** Create always mints. Update mints only when the stored hash is missing. */
  forceMint: boolean;
}

export interface EnsureConnectorIngressCredentialsResult {
  config: {
    ingestTokenHash: string;
  };
  ingestToken?: string;
}

export const ensureConnectorIngressCredentials = ({
  connectorId,
  spaceId,
  existingConfig,
  forceMint,
}: EnsureConnectorIngressCredentialsParams): EnsureConnectorIngressCredentialsResult => {
  const storedHash = getStoredHash(existingConfig);
  if (!forceMint && storedHash !== undefined) {
    return { config: { ingestTokenHash: storedHash } };
  }

  const ingestToken = generateIngestToken();
  return {
    config: {
      ingestTokenHash: computeIngestTokenHash({
        connectorId,
        spaceId,
        token: ingestToken,
      }),
    },
    ingestToken,
  };
};

export const applyInboundIngressCredentialsIfNeeded = ({
  actionTypeId,
  connectorId,
  spaceId,
  config,
  storedConfig,
  forceMint,
}: {
  actionTypeId: string;
  connectorId: string;
  spaceId: string;
  config: Record<string, unknown>;
  storedConfig?: Record<string, unknown>;
  forceMint: boolean;
}): { config: Record<string, unknown>; ingestToken?: string } => {
  if (!isInboundIngressConnectorType(actionTypeId)) {
    return { config };
  }

  const minted = ensureConnectorIngressCredentials({
    connectorId,
    spaceId,
    existingConfig: storedConfig ?? {},
    forceMint,
  });

  return {
    config: {
      ...config,
      ...minted.config,
    },
    ingestToken: minted.ingestToken,
  };
};
