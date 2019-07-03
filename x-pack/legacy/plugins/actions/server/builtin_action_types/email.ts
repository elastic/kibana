/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { sendEmail } from './lib/send_email';
import { ActionType, ActionTypeExecutorOptions } from '../types';

const PORT_MAX = 256 * 256 - 1;

export type ActionTypeConfigType = TypeOf<typeof ActionTypeConfig.schema>;

const ActionTypeConfig = {
  path: 'actionTypeConfig',
  schema: schema.object({
    service: schema.maybe(schema.string()),
    host: schema.maybe(schema.string()),
    port: schema.maybe(schema.number({ min: 1, max: PORT_MAX })),
    secure: schema.maybe(schema.boolean()),
    user: schema.string(),
    password: schema.string(),
    from: schema.string(),
  }),
};

const unencryptedConfigProperties = ['service', 'host', 'port', 'secure', 'from'];

export type ActionParamsType = TypeOf<typeof ActionParams.schema>;

const ActionParams = {
  path: 'actionParams',
  schema: schema.object({
    to: schema.arrayOf(schema.string(), { defaultValue: [] }),
    cc: schema.arrayOf(schema.string(), { defaultValue: [] }),
    bcc: schema.arrayOf(schema.string(), { defaultValue: [] }),
    subject: schema.string(),
    message: schema.string(),
  }),
};

function validateConfig(object: any): { error?: Error; value?: ActionTypeConfigType } {
  let value;

  try {
    value = ActionTypeConfig.schema.validate(object);
  } catch (error) {
    return { error };
  }

  const { service, host, port } = value;

  // Make sure service is set, or if not, both host/port must be set.
  // If service is set, host/port are ignored, when the email is sent.
  if (service == null) {
    if (host == null && port == null) {
      return toErrorObject('either [service] or [host]/[port] is required');
    }

    if (host == null) {
      return toErrorObject('[host] is required if [service] is not provided');
    }

    if (port == null) {
      return toErrorObject('[port] is required if [service] is not provided');
    }
  }

  return { value };
}

function validateParams(object: any): { error?: Error; value?: ActionParamsType } {
  let value;

  try {
    value = ActionParams.schema.validate(object);
  } catch (error) {
    return { error };
  }

  const { to, cc, bcc } = value;
  const addrs = to.length + cc.length + bcc.length;

  if (addrs === 0) {
    return toErrorObject('no [to], [cc], or [bcc] entries');
  }

  return { value };
}

export const actionType: ActionType = {
  id: '.email',
  name: 'email',
  unencryptedAttributes: unencryptedConfigProperties,
  validate: {
    config: { validate: validateConfig },
    params: { validate: validateParams },
  },
  executor,
};

async function executor({ config, params, services }: ActionTypeExecutorOptions): Promise<any> {
  const sendEmailOptions = {
    transport: {
      service: config.service,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      password: config.password,
    },
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

  return await sendEmail(sendEmailOptions);
}

function toErrorObject(message: string) {
  return { error: new Error(message) };
}
