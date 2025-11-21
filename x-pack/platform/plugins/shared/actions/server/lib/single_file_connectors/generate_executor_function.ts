/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import type { AxiosInstance } from 'axios';
import type {
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '../../types';
import type { ExecutorParams } from '../../sub_action_framework/types';

type RecordUnknown = Record<string, unknown>;

export const generateExecutorFunction = ({
  actions,
  getAxiosInstanceWithAuth,
}: {
  actions: ConnectorSpec['actions'];
  getAxiosInstanceWithAuth: (validatedSecrets: Record<string, unknown>) => Promise<AxiosInstance>;
}) =>
  async function (
    execOptions: ConnectorTypeExecutorOptions<RecordUnknown, RecordUnknown, RecordUnknown>
  ): Promise<ConnectorTypeExecutorResult<RecordUnknown | {}>> {
    const { actionId, params, secrets, logger } = execOptions;
    const { subAction, subActionParams } = params as ExecutorParams;
    let data = null;

    const axiosInstance = await getAxiosInstanceWithAuth({ ...secrets });

    if (!actions[subAction]) {
      const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // TODO - we need to update ActionContext in the spec
    const actionContext = {
      log: logger,
      client: axiosInstance,
      secrets,
    };

    // @ts-ignore
    const res = await actions[subAction].handler(actionContext, subActionParams);

    if (res != null) {
      data = res;
    }

    return { status: 'ok', data: data ?? {}, actionId };
  };
