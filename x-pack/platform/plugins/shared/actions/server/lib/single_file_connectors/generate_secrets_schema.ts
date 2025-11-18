/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z as z4 } from '@kbn/zod/v4';

import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import type { ActionTypeSecrets, ValidatorType } from '../../types';

export const generateSecretsSchema = ({
  authTypes,
  actions,
}: {
  authTypes: ConnectorSpec['authTypes'];
  actions: ActionsPluginSetupContract;
}): ValidatorType<ActionTypeSecrets> => {
  const secretSchemas: z4.core.$ZodTypeDiscriminable[] = [];
  for (const authType of authTypes || []) {
    secretSchemas.push(actions.getSchemaForAuthType(authType));
  }

  return {
    schema:
      secretSchemas.length > 0
        ? // to make zod types happy
          z4.discriminatedUnion('authType', [secretSchemas[0], ...secretSchemas.slice(1)])
        : z4.object({}).default({}),
  };
};
