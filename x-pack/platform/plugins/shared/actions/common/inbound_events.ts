/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/core-spaces-common';

export const INBOUND_EVENTS_TOKEN_MAX_LENGTH = 128;

/**
 * Hub path for inbound connector events. Must stay aligned with
 * `INBOUND_EVENTS_API_PATH`.
 */
export const buildInboundEventsPath = ({
  connectorTypeId,
  connectorId,
}: {
  connectorTypeId: string;
  connectorId: string;
}): string =>
  `/api/actions/events/${encodeURIComponent(connectorTypeId)}/${encodeURIComponent(connectorId)}`;

/**
 * Absolute (or origin-relative) ingest URL for a connector instance.
 * `publicBaseUrl` should be `server.publicBaseUrl` (includes the Kibana server
 * base path, not the space prefix). The default space has no `/s/{id}` prefix.
 */
export const buildInboundEventsUrl = ({
  publicBaseUrl,
  spaceId,
  connectorTypeId,
  connectorId,
}: {
  publicBaseUrl?: string;
  spaceId: string;
  connectorTypeId: string;
  connectorId: string;
}): string =>
  addSpaceIdToPath(
    publicBaseUrl ?? '',
    spaceId,
    buildInboundEventsPath({ connectorTypeId, connectorId })
  );
