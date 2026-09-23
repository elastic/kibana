/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  authTypeUsesRelay,
  getAuthModeForAuthTypeId,
  getConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getHeaderValue,
  clientTypes as defaultClientTypes,
} from '@kbn/connector-specs';
import type {
  ActionContext,
  ClientTypeSpec,
  ConnectorNetworkSettings,
  RelayActionClient,
} from '@kbn/connector-specs';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource, isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { ExecutorParams } from '../../sub_action_framework/types';
import type {
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '../../types';
import type { GetAxiosInstanceWithAuthFn, GetCredentialFn } from '../get_axios_instance';
import type { LeasePool } from '../lease_pool';
import { buildClientLeaseKey } from './build_client_lease_key';
import { AllowlistDeniedError } from './connector_network_errors';

type RecordUnknown = Record<string, unknown>;
interface FetchOptions {
  max_content_length?: number;
}

const DEFAULT_RESPONSE_SIZE_HEADER = 'content-length';

const getResponseSizeHeaderBytes = ({
  error,
  headerName,
}: {
  error: unknown;
  headerName: string;
}): number | undefined => {
  const axiosError = error as {
    response?: { headers?: unknown };
    request?: { res?: { headers?: unknown } };
  };

  const headerValue =
    getHeaderValue({ headers: axiosError.response?.headers, headerName }) ??
    getHeaderValue({ headers: axiosError.request?.res?.headers, headerName });

  return getFinitePositiveNumber(Array.isArray(headerValue) ? headerValue[0] : headerValue);
};

const getErrorMeta = ({
  error,
  contentLengthBytes,
}: {
  error: unknown;
  contentLengthBytes?: number;
}): Record<string, unknown> | undefined => {
  const connectorActionErrorMeta = getConnectorActionErrorMeta(error);
  // Connector-provided metadata (e.g. file size from provider API) takes
  // precedence over generic header-derived values.
  const errorMeta = {
    ...(contentLengthBytes !== undefined ? { contentLengthBytes } : {}),
    ...connectorActionErrorMeta,
  };

  return Object.keys(errorMeta).length > 0 ? errorMeta : undefined;
};

const isClientUserError = (error: unknown, clientType: ClientTypeSpec<unknown>): boolean => {
  return (
    error instanceof AllowlistDeniedError ||
    (error instanceof Error && isUserError(error)) ||
    (clientType.isUserError?.(error) ?? false)
  );
};

export const generateExecutorFunction = ({
  actions,
  getAxiosInstanceWithAuth,
  getCredential,
  getClientLeasePool,
  getRelayClient,
  networkSettings,
  clientTypes = defaultClientTypes,
}: {
  actions: ConnectorSpec['actions'];
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
  getCredential: GetCredentialFn;
  getClientLeasePool: () => LeasePool<unknown>;
  getRelayClient?: () => RelayActionClient | undefined;
  networkSettings: ConnectorNetworkSettings;
  clientTypes?: Readonly<Record<string, ClientTypeSpec<unknown>>>;
}) =>
  async function (
    execOptions: ConnectorTypeExecutorOptions<RecordUnknown, RecordUnknown, RecordUnknown>
  ): Promise<ConnectorTypeExecutorResult<unknown>> {
    const {
      actionId: connectorId,
      config,
      connectorTokenClient,
      globalAuthHeaders,
      params,
      secrets,
      logger,
      signal,
      authMode,
      profileUid,
      connectorVersion,
    } = execOptions;
    const { subAction, subActionParams, fetchOptions } = params as ExecutorParams & {
      fetchOptions?: FetchOptions;
    };

    const axiosInstance = await getAxiosInstanceWithAuth({
      connectorId,
      connectorTokenClient,
      additionalHeaders: globalAuthHeaders,
      secrets,
      signal,
      authMode,
      profileUid,
      ...(fetchOptions?.max_content_length
        ? { maxContentLength: fetchOptions.max_content_length }
        : {}),
    });

    if (!actions[subAction]) {
      const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const pool = getClientLeasePool();
    // Shared by getClient (authMode) and the Relay gate. Specs that route through the Relay
    // (isRelayAuth) read this same secrets.authType, so the two cannot disagree: the discriminated
    // union makes authType mandatory on saved connectors and buildConnector sets it on the
    // in-memory one. We read the auth type from `secrets` rather than the connector's persisted
    // `authMode`, which is inferred once when the connector is created and so can be absent (no
    // `authType` field, an auth type unknown at creation time, or an in-memory connector) and
    // would then fall back to `shared`.
    const authTypeId = (secrets as { authType?: string }).authType ?? 'none';
    const getClient = async (id: string): Promise<unknown> => {
      const clientType = clientTypes[id];
      if (!clientType) {
        throw new Error(`[Action][ExternalService] Unknown client type ${id}.`);
      }
      // The lease key uses this derived mode, not the persisted `authMode`: a per-user credential
      // leased under a `shared` identity would serve one user's warm client, and its captured
      // credential accessor, to every other user.
      const derivedAuthMode = getAuthModeForAuthTypeId(authTypeId);

      if (derivedAuthMode === 'per-user' && authMode !== 'per-user') {
        throw createTaskRunError(
          new Error(
            `[Action][ExternalService] Refusing to lease a pooled client: auth type "${authTypeId}" is per-user but connector "${connectorId}" resolved to "${
              authMode ?? 'shared'
            }".`
          ),
          TaskErrorSource.FRAMEWORK
        );
      }

      if (derivedAuthMode === 'per-user' && !profileUid) {
        throw createTaskRunError(
          new Error('A profile UID is required to lease a per-user connector client.'),
          TaskErrorSource.USER
        );
      }
      try {
        if (!connectorVersion) {
          throw new Error(`Missing saved-object version for persisted connector "${connectorId}".`);
        }
        return await pool.lease(
          buildClientLeaseKey({
            connectorId,
            clientTypeId: id,
            authMode: derivedAuthMode,
            profileUid,
            connectorVersion,
          }),
          () =>
            clientType.build({
              logger,
              config,
              networkSettings,
              credential: getCredential({
                connectorId,
                secrets,
                connectorTokenClient,
                authMode,
                profileUid,
              }),
            }),
          (client) => clientType.terminate(client)
        );
      } catch (err) {
        const isUser = isClientUserError(err, clientType);
        const error = err instanceof Error ? err : new Error(String(err));
        throw createTaskRunError(error, isUser ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK);
      }
    };

    const actionContext = {
      log: logger,
      client: axiosInstance,
      secrets,
      config,
      getClient: getClient as ActionContext['getClient'],
      relay: authTypeUsesRelay(authTypeId) ? getRelayClient?.() : undefined,
    };

    try {
      let data = {};
      const res = await actions[subAction].handler(actionContext, subActionParams);

      if (res != null) {
        data = res as Record<string, unknown>;
      }

      return { status: 'ok', data, actionId: connectorId };
    } catch (error) {
      const errorSource = error instanceof Error ? getErrorSource(error) : undefined;
      if (errorSource === TaskErrorSource.FRAMEWORK) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const contentLengthBytes = getResponseSizeHeaderBytes({
        error,
        headerName: actions[subAction].responseSizeHeader ?? DEFAULT_RESPONSE_SIZE_HEADER,
      });
      const errorMeta = getErrorMeta({ error, contentLengthBytes });
      logger.error(`error on ${connectorId} event: ${errorMessage}`);
      return {
        status: 'error',
        message: errorMessage,
        actionId: connectorId,
        ...(errorMeta ? { errorMeta } : {}),
        ...(errorSource === TaskErrorSource.USER
          ? { retry: false, errorSource: TaskErrorSource.USER }
          : {}),
      };
    }
  };
