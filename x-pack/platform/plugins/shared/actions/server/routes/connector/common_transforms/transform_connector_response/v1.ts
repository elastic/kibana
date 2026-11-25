/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorResponseV1 } from '../../../../../common/routes/connector/response';
import type { Connector } from '../../../../application/connector/types';
import { omitIngestTokenHashFromConfig } from '../omit_ingest_token_hash';
import { omitOutboundEnabledFromConfig } from '../omit_outbound_enabled';

export const transformConnectorResponse = (
  {
    id,
    name,
    config,
    actionTypeId,
    isPreconfigured,
    isMissingSecrets,
    isDeprecated,
    isSystemAction,
    isConnectorTypeDeprecated,
    authMode,
    isInboundEventsEnabled,
    isOutboundActionsEnabled,
    specVersion,
  }: Connector,
  {
    includeInboundEventsField,
    includeSpecVersionField,
  }: { includeInboundEventsField: boolean; includeSpecVersionField: boolean }
): ConnectorResponseV1 => ({
  id,
  name,
  config: omitOutboundEnabledFromConfig(omitIngestTokenHashFromConfig(config)),
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
  is_connector_type_deprecated: isConnectorTypeDeprecated,
  ...(authMode !== undefined ? { auth_mode: authMode } : {}),
  ...(includeInboundEventsField && isInboundEventsEnabled !== undefined
    ? { is_inbound_events_enabled: isInboundEventsEnabled }
    : {}),
  ...(includeInboundEventsField && isOutboundActionsEnabled !== undefined
    ? { is_outbound_actions_enabled: isOutboundActionsEnabled }
    : {}),
  ...(includeSpecVersionField && specVersion !== undefined ? { spec_version: specVersion } : {}),
});
