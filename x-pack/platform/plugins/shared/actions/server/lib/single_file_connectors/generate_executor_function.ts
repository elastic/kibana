/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec, ConnectorSpecStackCompat } from '@kbn/connector-specs';
import {
  TEST_CONNECTOR_SUB_ACTION,
  authTypeUsesRelay,
  getAuthModeForAuthTypeId,
  getConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getHeaderValue,
  isSelectedActionEnabled,
  type SelectedActions,
} from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { clientTypes as defaultClientTypes } from '@kbn/connector-specs/server';
import type {
  ActionContext,
  ClientTypeSpec,
  ConnectorNetworkSettings,
  PlatformServices,
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

const DEFAULT_ISOLATED_SUB_ACTIONS = ['test', TEST_CONNECTOR_SUB_ACTION];

const legacyClientBuildConfig = (config: RecordUnknown, connectorId: string): RecordUnknown => ({
  ...config,
  // Legacy MCP names the client after the connector id. Only the MCP client type
  // reads `clientName`; other client types ignore the extra field.
  clientName:
    typeof config.clientName === 'string' && config.clientName !== ''
      ? config.clientName
      : `kibana-mcp-connector-${connectorId}`,
});

const isClientUserError = (error: unknown, clientType: ClientTypeSpec<unknown>): boolean => {
  return (
    error instanceof AllowlistDeniedError ||
    (error instanceof Error && isUserError(error)) ||
    (clientType.isUserError?.(error) ?? false)
  );
};

export const generateExecutorFunction = ({
  connectorTypeId,
  actions,
  getAxiosInstanceWithAuth,
  getCredential,
  getClientLeasePool,
  getRelayClient,
  networkSettings,
  platform,
  clientTypes = defaultClientTypes,
  getJwtSigner,
  stackCompat,
  connectorName,
}: {
  connectorTypeId?: string;
  connectorName?: string;
  actions: ConnectorSpec['actions'];
  getJwtSigner?: (connectorId: string) => ActionContext['signJwt'];
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
  getCredential: GetCredentialFn;
  getClientLeasePool: () => LeasePool<unknown>;
  getRelayClient?: () => RelayActionClient | undefined;
  networkSettings: ConnectorNetworkSettings;
  platform: PlatformServices;
  clientTypes?: Readonly<Record<string, ClientTypeSpec<unknown>>>;
  /**
   * Legacy stack connector path. Builds pooled-client credentials from
   * `getAuthHeaders`, skips per-user lease checks, and rethrows handler errors.
   */
  stackCompat?: Pick<
    ConnectorSpecStackCompat,
    | 'getAuthHeaders'
    | 'classifyError'
    | 'isolatedClientSubActions'
    | 'formatIsolatedTerminateFailure'
  >;
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
      connectorUsageCollector,
    } = execOptions;
    const { subAction, subActionParams, fetchOptions } = params as ExecutorParams & {
      fetchOptions?: FetchOptions;
    };
    const isolatedSubActions = new Set(
      stackCompat ? stackCompat.isolatedClientSubActions ?? DEFAULT_ISOLATED_SUB_ACTIONS : []
    );
    const isolateClient = isolatedSubActions.has(subAction);

    const axiosInstance = await getAxiosInstanceWithAuth({
      connectorId,
      connectorTypeId,
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
      if (stackCompat) {
        throw new Error(
          `Sub action "${subAction}" is not registered. Connector id: ${connectorId}. Connector name: ${
            connectorName ?? ''
          }. Connector type: ${connectorTypeId ?? ''}`
        );
      }
      const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Legacy stack connectors do not have selectedActions. Skip the gate so a stored
    // value cannot reject an action the previous executor would run.
    const selectedActions = config.selectedActions as SelectedActions;
    if (!stackCompat && !isSelectedActionEnabled(subAction, selectedActions)) {
      const errorMessage = `[Action][ExternalService] Action '${subAction}' is not enabled for this connector.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    let parsedSubActionParams: unknown = subActionParams;
    if (stackCompat && actions[subAction].input) {
      try {
        parsedSubActionParams = actions[subAction].input.parse(subActionParams);
      } catch (reqValidationError) {
        let errMessage =
          reqValidationError instanceof Error
            ? reqValidationError.message
            : String(reqValidationError);
        if (reqValidationError instanceof z.ZodError) {
          errMessage = z.prettifyError(reqValidationError);
        }
        throw createTaskRunError(
          new Error(`Request validation failed (${errMessage})`),
          TaskErrorSource.USER
        );
      }
    }

    const pool = getClientLeasePool();
    const acquiredClients: Array<{
      clientType: ClientTypeSpec<unknown>;
      key: string;
      promise: Promise<unknown>;
      release: () => void;
    }> = [];
    const isolatedClients: Array<{
      clientType: ClientTypeSpec<unknown>;
      client: unknown;
    }> = [];

    // Release before invalidating: termination waits for every active use, including ours.
    const releaseAcquiredClients = (): void => {
      acquiredClients.forEach(({ release }) => release());
    };

    const terminateIsolatedClients = async (): Promise<void> => {
      await Promise.all(
        isolatedClients.splice(0).map(async ({ clientType, client }) => {
          try {
            await clientType.terminate(client);
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            logger.debug(
              stackCompat?.formatIsolatedTerminateFailure?.(err) ??
                `Isolated client terminate failed: ${detail}`
            );
          }
        })
      );
    };

    const invalidateAcquiredClientsForError = async (error: unknown): Promise<void> => {
      await Promise.all(
        acquiredClients.map(async ({ clientType, key, promise }) => {
          if (clientType.shouldInvalidateOnError?.(error)) {
            await pool.invalidate(key, promise);
          }
        })
      );
    };

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
      // Stack-compat connectors are shared. Skip the derivation so a legacy `secrets` object
      // (no `authType`) cannot be treated as a per-user auth type.
      const derivedAuthMode = stackCompat ? undefined : getAuthModeForAuthTypeId(authTypeId);

      if (!stackCompat && derivedAuthMode === 'per-user' && authMode !== 'per-user') {
        throw createTaskRunError(
          new Error(
            `[Action][ExternalService] Refusing to lease a pooled client: auth type "${authTypeId}" is per-user but connector "${connectorId}" resolved to "${
              authMode ?? 'shared'
            }".`
          ),
          TaskErrorSource.FRAMEWORK
        );
      }

      if (!stackCompat && derivedAuthMode === 'per-user' && !profileUid) {
        throw createTaskRunError(
          new Error('A profile UID is required to lease a per-user connector client.'),
          TaskErrorSource.USER
        );
      }
      const buildConfig = stackCompat ? legacyClientBuildConfig(config, connectorId) : config;
      const buildClient = () =>
        clientType.build({
          logger,
          config: buildConfig,
          networkSettings,
          platform,
          credential: stackCompat
            ? { getAuthHeaders: () => stackCompat.getAuthHeaders(config, secrets) }
            : getCredential({
                connectorId,
                connectorTypeId,
                secrets,
                connectorTokenClient,
                authMode,
                profileUid,
              }),
        });

      try {
        if (!connectorVersion) {
          const message = stackCompat
            ? `Missing saved-object version for connector "${connectorId}".`
            : `Missing saved-object version for persisted connector "${connectorId}".`;
          throw stackCompat
            ? createTaskRunError(new Error(message), TaskErrorSource.FRAMEWORK)
            : new Error(message);
        }

        // `test` and `_test` stay outside the pool: build, use, always terminate.
        if (isolateClient) {
          const client = await buildClient();
          isolatedClients.push({ clientType, client });
          return client;
        }

        const key = buildClientLeaseKey({
          connectorId,
          clientTypeId: id,
          authMode: derivedAuthMode,
          profileUid,
          connectorVersion,
        });
        const { promise, release } = pool.acquire(key, buildClient, (client) =>
          clientType.terminate(client)
        );
        acquiredClients.push({ clientType, key, promise, release });
        return await promise;
      } catch (err) {
        if (stackCompat) {
          throw err;
        }
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
      connectorId,
      connectorUsageCollector,
      getClient: getClient as ActionContext['getClient'],
      relay: authTypeUsesRelay(authTypeId) ? getRelayClient?.() : undefined,
      signJwt: getJwtSigner?.(connectorId),
    };

    try {
      let data = {};
      const res = await actions[subAction].handler(actionContext, parsedSubActionParams);

      if (res != null) {
        data = res as Record<string, unknown>;
      }

      return { status: 'ok', data, actionId: connectorId };
    } catch (error) {
      releaseAcquiredClients();
      await invalidateAcquiredClientsForError(error);
      if (stackCompat) {
        const classification = stackCompat.classifyError?.(error);
        if (classification === undefined) {
          throw error;
        }
        const tagged = error instanceof Error ? error : new Error(String(error));
        throw createTaskRunError(
          tagged,
          classification === 'user' ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK
        );
      }
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
    } finally {
      releaseAcquiredClients();
      await terminateIsolatedClients();
    }
  };
