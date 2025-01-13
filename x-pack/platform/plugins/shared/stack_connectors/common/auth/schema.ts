/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { AuthType, SSLCertType } from './constants';

export const authTypeSchema = schema.maybe(
  schema.oneOf(
    [schema.literal(AuthType.Basic), schema.literal(AuthType.SSL), schema.literal(null)],
    {
      defaultValue: AuthType.Basic,
    }
  )
);

export const hasAuthSchema = schema.boolean({ defaultValue: true });

export const AuthConfiguration = {
  hasAuth: hasAuthSchema,
  authType: authTypeSchema,
  certType: schema.maybe(
    schema.oneOf([schema.literal(SSLCertType.CRT), schema.literal(SSLCertType.PFX)])
  ),
  ca: schema.maybe(schema.string()),
  verificationMode: schema.maybe(
    schema.oneOf([schema.literal('none'), schema.literal('certificate'), schema.literal('full')])
  ),
};

export const SecretConfiguration = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
  crt: schema.nullable(schema.string()),
  key: schema.nullable(schema.string()),
  pfx: schema.nullable(schema.string()),
};

export const SecretConfigurationSchemaValidation = {
  validate: (secrets: any) => {
    // user and password must be set together (or not at all)
    if (!secrets.password && !secrets.user && !secrets.crt && !secrets.key && !secrets.pfx) return;
    if (secrets.password && secrets.user && !secrets.crt && !secrets.key && !secrets.pfx) return;
    if (secrets.crt && secrets.key && !secrets.user && !secrets.pfx) return;
    if (!secrets.crt && !secrets.key && !secrets.user && secrets.pfx) return;
    return i18n.translate('xpack.stackConnectors.webhook.invalidSecrets', {
      defaultMessage:
        'must specify one of the following schemas: user and password; crt and key (with optional password); or pfx (with optional password)',
    });
  },
};

export const SecretConfigurationSchema = schema.object(
  SecretConfiguration,
  SecretConfigurationSchemaValidation
);
