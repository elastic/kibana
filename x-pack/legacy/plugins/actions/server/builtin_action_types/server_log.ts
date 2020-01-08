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
import { withoutControlCharacters } from './lib/string_utils';

const ACTION_NAME = 'server-log';

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string(),
  level: schema.oneOf(
    [
      schema.literal('trace'),
      schema.literal('debug'),
      schema.literal('info'),
      schema.literal('warn'),
      schema.literal('error'),
      schema.literal('fatal'),
    ],
    { defaultValue: 'info' }
  ),
});

// action type definition
export function getActionType({ logger }: { logger: Logger }): ActionType {
  return {
    id: '.server-log',
    name: ACTION_NAME,
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

  const sanitizedMessage = withoutControlCharacters(params.message);
  try {
    logger[params.level](`${ACTION_NAME}: ${sanitizedMessage}`);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.serverLog.errorLoggingErrorMessage', {
      defaultMessage: 'error logging message',
    });
    return {
      status: 'error',
      message,
      serviceMessage: err.message,
      actionId,
    };
  }

  return { status: 'ok', actionId };
}
