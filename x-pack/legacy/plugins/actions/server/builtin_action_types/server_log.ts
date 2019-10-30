/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { Logger } from '../../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string(),
  level: schema.oneOf([
    schema.literal('trace'),
    schema.literal('debug'),
    schema.literal('info'),
    schema.literal('warn'),
    schema.literal('error'),
    schema.literal('fatal'),
  ]),
});

// action type definition
export function getActionType({ logger }: { logger: Logger }): ActionType {
  return {
    id: '.server-log',
    name: 'server-log',
    validate: {
      params: ParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const params = execOptions.params as ActionParamsType;

  try {
    logger[params.level](params.message);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.serverLog.errorLoggingErrorMessage', {
      defaultMessage: 'error in action "{actionId}" logging message: {errorMessage}',
      values: {
        actionId,
        errorMessage: err.message,
      },
    });
    return {
      status: 'error',
      message,
    };
  }

  return { status: 'ok' };
}
