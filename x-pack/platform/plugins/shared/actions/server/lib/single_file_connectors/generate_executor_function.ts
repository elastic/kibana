/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  getConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getHeaderValue,
  clientTypes as defaultClientTypes,
} from '@kbn/connector-specs';
import type { ActionContext, ClientTypeSpec, ConnectorNetwork } from '@kbn/connector-specs';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource, isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { ExecutorParams } from '../../sub_action_framework/types';
import type {
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '../../types';
import type { GetAxiosInstanceWithAuthFn } from '../get_axios_instance';
import type { LeasePool } from '../lease_pool';
import { buildClientLeaseKey } from './build_client_lease_key';

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

export const generateExecutorFunction = ({
  actions,
  getAxiosInstanceWithAuth,
  getClientLeasePool,
  network,
  clientTypes = defaultClientTypes,
}: {
  actions: ConnectorSpec['actions'];
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
  getClientLeasePool: () => LeasePool<unknown>;
  network: ConnectorNetwork;
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
    const getClient = async (id: string): Promise<unknown> => {
      const clientType = clientTypes[id];
      if (!clientType) {
        throw new Error(`[Action][ExternalService] Unknown client type ${id}.`);
      }
      try {
        return await pool.lease(
          buildClientLeaseKey(connectorId, id),
          () => clientType.build({ logger, axiosInstance, config, network }),
          clientType.terminate
        );
      } catch (err) {
        const isUser = isUserError(err) || (clientType.isUserError?.(err) ?? false);
        throw createTaskRunError(err, isUser ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK);
      }
    };

    const actionContext = {
      log: logger,
      client: axiosInstance,
      secrets,
      config,
      getClient: getClient as ActionContext['getClient'],
    };

    try {
      let data = {};
      const res = await actions[subAction].handler(actionContext, subActionParams);

      if (res != null) {
        data = res as Record<string, unknown>;
      }

      return { status: 'ok', data, actionId: connectorId };
    } catch (error) {
      if (error instanceof Error && getErrorSource(error)) throw error;
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
      };
    }
  };
