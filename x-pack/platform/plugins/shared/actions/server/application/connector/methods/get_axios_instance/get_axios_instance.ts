/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import { isWorkflowsOnlyConnectorType } from '../../../../lib/single_file_connectors/is_workflows_only_connector';
import type { ActionsClientContext } from '../../../../actions_client';
import { getConnectorAuth } from '../../lib/get_connector_auth';

type ValidatedSecrets = Record<string, unknown>;

export type GetAxiosInstanceWithAuthFn = (secrets: ValidatedSecrets) => Promise<AxiosInstance>;

export async function getAxiosInstance(
  context: ActionsClientContext,
  connectorId: string
): Promise<AxiosInstance> {
  const { getAxiosInstanceWithAuth, connectorTokenClient } = context;

  const { actionType, authMode, validatedSecrets, profileUid } = await getConnectorAuth(
    context,
    connectorId,
    {
      onActionType: (resolvedActionType, resolvedActionTypeId) => {
        if (!isWorkflowsOnlyConnectorType(resolvedActionType)) {
          throw new Error(
            `Unable to get axios instance for ${resolvedActionTypeId}. This function is exclusive for workflows-only connectors.`
          );
        }
      },
    }
  );

  return await getAxiosInstanceWithAuth({
    connectorId,
    connectorTokenClient,
    additionalHeaders: actionType.globalAuthHeaders,
    secrets: validatedSecrets,
    authMode,
    profileUid,
  });
}
