/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

const DEFAULT_TAGS = ['info', 'alerting'];

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: DEFAULT_TAGS }),
});

// action type definition
export function getActionType(): ActionType {
  return {
    id: '.server-log',
    name: 'server-log',
    validate: {
      params: ParamsSchema,
    },
    executor,
  };
}

// action executor

async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const id = execOptions.id;
  const params = execOptions.params as ActionParamsType;
  const services = execOptions.services;

  try {
    services.log(params.tags, params.message);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.serverLog.errorLoggingErrorMessage', {
      defaultMessage: 'error in action "{id}" logging message: {errorMessage}',
      values: {
        id,
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
