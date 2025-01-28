/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { LogMeta } from '@kbn/core/server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { AlertingConnectorFeatureId, UptimeConnectorFeatureId } from '@kbn/actions-plugin/common';
import { ConnectorAdapter } from '@kbn/alerting-plugin/server';

// see: https://en.wikipedia.org/wiki/Unicode_control_characters
// but don't include tabs (0x09), they're fine
const CONTROL_CHAR_PATTERN = /[\x00-\x08]|[\x0A-\x1F]|[\x7F-\x9F]|[\u2028-\u2029]/g;

// replaces control characters in string with ;, but leaves tabs
function withoutControlCharacters(s: string): string {
  return s.replace(CONTROL_CHAR_PATTERN, ';');
}

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
});

export const ConnectorTypeId = '.system-log-example';
// connector type definition
export function getConnectorType(): ServerLogConnectorType {
  return {
    id: ConnectorTypeId,
    isSystemActionType: true,
    minimumLicenseRequired: 'gold', // Third party action types require at least gold
    name: i18n.translate('xpack.stackConnectors.systemLogExample.title', {
      defaultMessage: 'System log - example',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId, UptimeConnectorFeatureId],
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

export const connectorAdapter: ConnectorAdapter<{ message: string }, { message: string }> = {
  connectorTypeId: ConnectorTypeId,
  ruleActionParamsSchema: ParamsSchema,
  buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => {
    const message = `The system has detected ${alerts.new.count} new, ${alerts.ongoing.count} ongoing, and ${alerts.recovered.count} recovered alerts.`;

    return { ...params, message };
  },
};

// action executor

async function executor(
  execOptions: ServerLogConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<void>> {
  const { actionId, params, logger } = execOptions;
  const sanitizedMessage = withoutControlCharacters(params.message);
  try {
    logger.info<LogMeta>(`System action example: Server log: ${sanitizedMessage}`);
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
