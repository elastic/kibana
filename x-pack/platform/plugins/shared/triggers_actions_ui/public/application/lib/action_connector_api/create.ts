/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { RewriteRequestCase, RewriteResponseCase } from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type {
  ActionConnector,
  ActionConnectorProps,
  ActionConnectorWithoutId,
} from '../../../types';

const rewriteBodyRequest: RewriteResponseCase<
  Pick<ActionConnectorWithoutId, 'actionTypeId' | 'name' | 'config' | 'secrets'>
> = ({ actionTypeId, ...res }) => ({
  ...res,
  connector_type_id: actionTypeId,
});

const rewriteBodyRes: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
  ...res
}) => ({
  ...res,
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  isMissingSecrets,
  isSystemAction,
});

export async function createActionConnector({
  http,
  connector,
}: {
  http: HttpSetup;
  connector: Pick<ActionConnectorWithoutId, 'actionTypeId' | 'name' | 'config' | 'secrets'>;
}): Promise<ActionConnector> {
  const res = await http.post<Parameters<typeof rewriteBodyRes>[0]>(
    `${BASE_ACTION_API_PATH}/connector`,
    { body: JSON.stringify(rewriteBodyRequest(connector)) }
  );
  return rewriteBodyRes(res) as ActionConnector;
}
