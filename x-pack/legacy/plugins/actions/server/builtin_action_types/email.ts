/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';
import nodemailerServices from 'nodemailer/lib/well-known/services.json';

import { sendEmail, JSON_TRANSPORT_SERVICE } from './lib/send_email';
import { ActionType, ActionTypeExecutorOptions } from '../types';

const PORT_MAX = 256 * 256 - 1;

export type ActionTypeConfigType = TypeOf<typeof ActionTypeConfig.schema>;

function nullableType<V>(type: Type<V>) {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: () => null });
}

const ActionTypeConfig = {
  path: 'actionTypeConfig',
  schema: schema.object(
    {
      service: nullableType(schema.string()),
      host: nullableType(schema.string()),
      port: nullableType(schema.number({ min: 1, max: PORT_MAX })),
      secure: nullableType(schema.boolean()),
      user: schema.string(),
      password: schema.string(),
      from: schema.string(),
    },
    {
      validate: validateConfigType,
    }
  ),
};

function validateConfigType(configObject: any): string | void {
  // avoids circular reference ...
  const config: ActionTypeConfigType = configObject;

  // Make sure service is set, or if not, both host/port must be set.
  // If service is set, host/port are ignored, when the email is sent.
  if (config.service == null) {
    if (config.host == null && config.port == null) {
      return 'either [service] or [host]/[port] is required';
    }

    if (config.host == null) {
      return '[host] is required if [service] is not provided';
    }

    if (config.port == null) {
      return '[port] is required if [service] is not provided';
    }
  } else {
    // service is not null
    if (!isValidService(config.service)) {
      return `[service] value "${config.service}" is not valid`;
    }
  }
}

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

function validateConfig(object: any): { error?: Error; value?: object } {
  let value;

  try {
    value = ActionTypeConfig.schema.validate(object) as any;
  } catch (error) {
    return { error };
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
  const transport: any = {
    user: config.user,
    password: config.password,
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

  return await sendEmail(sendEmailOptions);
}

const ValidServiceNames = getValidServiceNames();

function isValidService(service: string): boolean {
  return ValidServiceNames.has(service.toLowerCase());
}

function getValidServiceNames(): Set<string> {
  const result = new Set<string>();

  // add our special json service
  result.add(JSON_TRANSPORT_SERVICE);

  const keys = Object.keys(nodemailerServices) as string[];
  for (const key of keys) {
    result.add(key.toLowerCase());

    const record = nodemailerServices[key];
    if (record.aliases == null) continue;

    for (const alias of record.aliases as string[]) {
      result.add(alias.toLowerCase());
    }
  }

  return result;
}

// Returns the secure value - whether to use TLS or not.
// Respect value if not null | undefined.
// Otherwise, if the port is 465, return true, otherwise return false.
// Based on data here:
// - https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json
function getSecureValue(secure: boolean | null | undefined, port: number): boolean {
  if (secure != null) return secure;
  if (port === 465) return true;
  return false;
}

function toErrorObject(message: string) {
  return { error: new Error(message) };
}
