/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z3 } from '@kbn/zod';
import { z as z4 } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ExecutorType } from '../types';
import type { ExecutorParams, SubActionConnectorType } from './types';
import { formatZodError } from '../lib';

const isFunction = (v: unknown): v is Function => {
  return typeof v === 'function';
};

const getConnectorErrorMsg = (actionId: string, connector: { id: string; name: string }) =>
  `Connector id: ${actionId}. Connector name: ${connector.name}. Connector type: ${connector.id}`;

export const buildExecutor = <
  Config extends Record<string, unknown>,
  Secrets extends Record<string, unknown>
>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: SubActionConnectorType<Config, Secrets>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<Config, Secrets, ExecutorParams, unknown> => {
  return async ({
    actionId,
    params,
    config,
    secrets,
    services,
    request,
    connectorUsageCollector,
  }) => {
    const subAction = params.subAction;
    const subActionParams = params.subActionParams;

    const service = connector.getService({
      connector: { id: actionId, type: connector.id },
      config,
      secrets,
      configurationUtilities,
      logger,
      services,
      request,
    });

    const subActions = service.getSubActions();

    if (subActions.size === 0) {
      throw new Error('You should register at least one subAction for your connector type');
    }

    const action = subActions.get(subAction);

    if (!action) {
      throw new Error(
        `Sub action "${subAction}" is not registered. ${getConnectorErrorMsg(actionId, connector)}`
      );
    }

    const method = action.method;

    if (!service[method]) {
      throw new Error(
        `Method "${method}" does not exists in service. Sub action: "${subAction}". ${getConnectorErrorMsg(
          actionId,
          connector
        )}`
      );
    }

    const func = service[method];

    if (!isFunction(func)) {
      throw new Error(
        `Method "${method}" must be a function. ${getConnectorErrorMsg(actionId, connector)}`
      );
    }

    let _subActionParams = subActionParams ?? {};

    if (action.schema) {
      try {
        _subActionParams = action.schema.parse(subActionParams) as typeof subActionParams;
      } catch (reqValidationError) {
        let errMessage = reqValidationError.message;
        if (reqValidationError instanceof z3.ZodError) {
          errMessage = formatZodError(reqValidationError);
        } else if (reqValidationError instanceof z4.ZodError) {
          errMessage = z4.prettifyError(reqValidationError);
        }
        throw createTaskRunError(
          new Error(`Request validation failed (${errMessage})`),
          TaskErrorSource.USER
        );
      }
    }

    const data = await func.call(service, _subActionParams, connectorUsageCollector);
    return { status: 'ok', data: data ?? {}, actionId };
  };
};
