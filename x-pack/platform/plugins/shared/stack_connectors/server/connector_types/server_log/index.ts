/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { Logger, LogMeta } from '@kbn/core/server';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import {
  CONNECTOR_NAME,
  CONNECTOR_ID,
  ConfigSchema,
  SecretsSchema,
  ParamsSchema,
} from '@kbn/connector-schemas/server_log';
import type { Config, Secrets, ActionParamsType } from '@kbn/connector-schemas/server_log';
import { withoutControlCharacters } from '../lib/string_utils';

export type ServerLogConnectorType = ConnectorType<{}, {}, ActionParamsType>;
export type ServerLogConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  Config,
  Secrets,
  ActionParamsType
>;

// connector type definition
export function getConnectorType(): ServerLogConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'basic',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: ConfigSchema },
      secrets: { schema: SecretsSchema },
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
