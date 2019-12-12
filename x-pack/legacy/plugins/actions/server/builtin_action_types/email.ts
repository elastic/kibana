/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import nodemailerGetService from 'nodemailer/lib/well-known';

import { sendEmail, JSON_TRANSPORT_SERVICE } from './lib/send_email';
import { nullableType } from './lib/nullable';
import { portSchema } from './lib/schemas';
import { Logger } from '../../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

// config definition
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchemaProps = {
  service: nullableType(schema.string()),
  host: nullableType(schema.string()),
  port: nullableType(portSchema()),
  secure: nullableType(schema.boolean()),
  from: schema.string(),
};

const ConfigSchema = schema.object(ConfigSchemaProps);

function validateConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: any
): string | void {
  // avoids circular reference ...
  const config: ActionTypeConfigType = configObject;

  // Make sure service is set, or if not, both host/port must be set.
  // If service is set, host/port are ignored, when the email is sent.
  // Note, not currently making these message translated, as will be
  // emitted alongside messages from @kbn/config-schema, which does not
  // translate messages.
  if (config.service === JSON_TRANSPORT_SERVICE) {
    return;
  } else if (config.service == null) {
    if (config.host == null && config.port == null) {
      return 'either [service] or [host]/[port] is required';
    }

    if (config.host == null) {
      return '[host] is required if [service] is not provided';
    }

    if (config.port == null) {
      return '[port] is required if [service] is not provided';
    }

    if (!configurationUtilities.isWhitelistedHostname(config.host)) {
      return `[host] value '${config.host}' is not in the whitelistedHosts configuration`;
    }
  } else {
    const host = getServiceNameHost(config.service);
    if (host == null) {
      return `[service] value '${config.service}' is not valid`;
    }
    if (!configurationUtilities.isWhitelistedHostname(host)) {
      return `[service] value '${config.service}' resolves to host '${host}' which is not in the whitelistedHosts configuration`;
    }
  }
}

// secrets definition

export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchema = schema.object({
  user: schema.string(),
  password: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object(
  {
    to: schema.arrayOf(schema.string(), { defaultValue: [] }),
    cc: schema.arrayOf(schema.string(), { defaultValue: [] }),
    bcc: schema.arrayOf(schema.string(), { defaultValue: [] }),
    subject: schema.string(),
    message: schema.string(),
  },
  {
    validate: validateParams,
  }
);

function validateParams(paramsObject: any): string | void {
  // avoids circular reference ...
  const params: ActionParamsType = paramsObject;

  const { to, cc, bcc } = params;
  const addrs = to.length + cc.length + bcc.length;

  if (addrs === 0) {
    return 'no [to], [cc], or [bcc] entries';
  }
}

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

// action type definition
export function getActionType(params: GetActionTypeParams): ActionType {
  const { logger, configurationUtilities } = params;
  return {
    id: '.email',
    name: 'email',
    validate: {
      config: schema.object(ConfigSchemaProps, {
        validate: curry(validateConfig)(configurationUtilities),
      }),
      secrets: SecretsSchema,
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
  const config = execOptions.config as ActionTypeConfigType;
  const secrets = execOptions.secrets as ActionTypeSecretsType;
  const params = execOptions.params as ActionParamsType;

  const transport: any = {
    user: secrets.user,
    password: secrets.password,
  };

  if (config.service !== null) {
    transport.service = config.service;
  } else {
    transport.host = config.host;
    transport.port = config.port;
    transport.secure = getSecureValue(config.secure, config.port);
  }

  const sendEmailOptions = {
    transport,
    routing: {
      from: config.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
    },
    content: {
      subject: params.subject,
      message: params.message,
    },
  };

  let result;

  try {
    result = await sendEmail(logger, sendEmailOptions);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.email.errorSendingErrorMessage', {
      defaultMessage: 'error sending email',
    });
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  return { status: 'ok', data: result, actionId };
}

// utilities

function getServiceNameHost(service: string): string | null {
  const serviceEntry = nodemailerGetService(service);
  if (serviceEntry === false) return null;

  // in theory this won't happen, but it's JS, so just to be safe ...
  if (serviceEntry == null) return null;

  return serviceEntry.host || null;
}

// Returns the secure value - whether to use TLS or not.
// Respect value if not null | undefined.
// Otherwise, if the port is 465, return true, otherwise return false.
// Based on data here:
// - https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json
function getSecureValue(secure: boolean | null | undefined, port: number | null): boolean {
  if (secure != null) return secure;
  if (port === 465) return true;
  return false;
}
