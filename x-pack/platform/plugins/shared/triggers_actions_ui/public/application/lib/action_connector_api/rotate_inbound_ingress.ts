/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';
import type { ActionConnector, ActionConnectorProps } from '../../../types';
import { rewriteConnectorSecrets } from './rewrite_connector_secrets';

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
  secrets,
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
  secrets: rewriteConnectorSecrets(secrets ?? {}),
});

export async function rotateInboundIngress({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<ActionConnector> {
  const res = await http.post<Parameters<typeof rewriteBodyRes>[0]>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_rotate_ingress`
  );
  return rewriteBodyRes(res) as ActionConnector;
}
