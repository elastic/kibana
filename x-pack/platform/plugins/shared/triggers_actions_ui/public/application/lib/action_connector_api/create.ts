/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { RewriteRequestCase, RewriteResponseCase } from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type {
  ActionConnector,
  ActionConnectorProps,
  ActionConnectorWithoutId,
} from '../../../types';

const rewriteBodyRequest: RewriteResponseCase<
  Pick<
    ActionConnectorWithoutId,
    | 'actionTypeId'
    | 'name'
    | 'config'
    | 'secrets'
    | 'isInboundEventsEnabled'
    | 'isOutboundActionsEnabled'
  >
> = ({ actionTypeId, isInboundEventsEnabled, isOutboundActionsEnabled, ...res }) => ({
  ...res,
  connector_type_id: actionTypeId,
  ...(isInboundEventsEnabled !== undefined
    ? { is_inbound_events_enabled: isInboundEventsEnabled }
    : {}),
  ...(isOutboundActionsEnabled !== undefined
    ? { is_outbound_actions_enabled: isOutboundActionsEnabled }
    : {}),
});

const rewriteBodyRes: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
  is_connector_type_deprecated: isConnectorTypeDeprecated,
  auth_mode: authMode,
  is_inbound_events_enabled: isInboundEventsEnabled,
  is_outbound_actions_enabled: isOutboundActionsEnabled,
  ...res
}) => ({
  ...res,
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  isMissingSecrets,
  isSystemAction,
  isConnectorTypeDeprecated,
  ...(authMode !== undefined ? { authMode } : {}),
  ...(isInboundEventsEnabled !== undefined ? { isInboundEventsEnabled } : {}),
  ...(isOutboundActionsEnabled !== undefined ? { isOutboundActionsEnabled } : {}),
});

export async function createActionConnector({
  http,
  connector,
  id,
}: {
  http: HttpSetup;
  connector: Pick<
    ActionConnectorWithoutId,
    | 'actionTypeId'
    | 'name'
    | 'config'
    | 'secrets'
    | 'isInboundEventsEnabled'
    | 'isOutboundActionsEnabled'
  >;
  id?: string;
}): Promise<ActionConnector> {
  const path = id
    ? `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}`
    : `${BASE_ACTION_API_PATH}/connector`;

  const res = await http.post<Parameters<typeof rewriteBodyRes>[0]>(path, {
    body: JSON.stringify(rewriteBodyRequest(connector)),
  });
  return rewriteBodyRes(res) as ActionConnector;
}
