/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { Logger, LogMeta } from '@kbn/core/server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { withoutControlCharacters } from '../lib/string_utils';

export type ServerLogConnectorType = ConnectorType<{}, {}, ActionParamsType>;
export type ServerLogConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ActionParamsType
>;

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

export const ConnectorTypeId = '.server-log';
// connector type definition
export function getConnectorType(): ServerLogConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'basic',
    name: i18n.translate('xpack.stackConnectors.serverLog.title', {
      defaultMessage: 'Server log',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: ParamsSchema,
      },
    },
    executor,
  };
}

// action executor

async function executor(
  execOptions: ServerLogConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<void>> {
  const { actionId, params, logger } = execOptions;

  const sanitizedMessage = withoutControlCharacters(params.message);
  try {
    (logger[params.level] as Logger['info'])<LogMeta>(`Server log: ${sanitizedMessage}`);
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.serverLog.errorLoggingErrorMessage', {
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
