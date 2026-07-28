/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IN_MEMORY_CONNECTOR_REVISION = 'in-memory';

interface ClientLeaseIdentity {
  connectorId: string;
  spaceId: string;
  clientTypeId: string;
  authMode?: string;
  profileUid?: string;
  connectorVersion: string;
}

const encodeComponent = (component: string): string => encodeURIComponent(component);

/**
 * Pool key identity is connector, space, client type, authentication identity, and connector
 * revision. The connector remains the first encoded component so LeasePool can evict every
 * client for a connector efficiently.
 */
export const buildClientLeaseKey = ({
  connectorId,
  spaceId,
  clientTypeId,
  authMode,
  profileUid,
  connectorVersion,
}: ClientLeaseIdentity): string => {
  if (authMode === 'per-user' && !profileUid) {
    throw new Error('A profile UID is required to lease a per-user connector client.');
  }

  const authIdentity = authMode === 'per-user' ? profileUid! : 'shared';
  return [connectorId, spaceId, clientTypeId, authIdentity, connectorVersion]
    .map(encodeComponent)
    .join(':');
};
