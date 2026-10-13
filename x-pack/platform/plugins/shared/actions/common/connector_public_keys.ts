/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/core-spaces-common';

export const CONNECTOR_PUBLIC_KEYS_API_PATH =
  '/api/actions/public/{connector_type_id}/{connector_id}';
export const SSF_DISCOVERY_PATH_PREFIX = '/.well-known/ssf-configuration';

export interface ConnectorPublicKeyUrls {
  issuer: string;
  jwksUrl: string;
  discoveryUrl: string;
}

/**
 * Issuer, JWKS, and discovery URLs for a connector that publishes keys. `publicBaseUrl` must be
 * the `server.publicBaseUrl` origin without a path.
 */
export const buildConnectorPublicKeyUrls = ({
  publicBaseUrl,
  spaceId,
  connectorTypeId,
  connectorId,
}: {
  publicBaseUrl: string;
  spaceId: string;
  connectorTypeId: string;
  connectorId: string;
}): ConnectorPublicKeyUrls => {
  const issuerPath = addSpaceIdToPath(
    '',
    spaceId,
    `/api/actions/public/${encodeURIComponent(connectorTypeId)}/${encodeURIComponent(connectorId)}`
  );
  return {
    issuer: `${publicBaseUrl}${issuerPath}`,
    jwksUrl: `${publicBaseUrl}${issuerPath}/jwks.json`,
    discoveryUrl: `${publicBaseUrl}${SSF_DISCOVERY_PATH_PREFIX}${issuerPath}`,
  };
};
