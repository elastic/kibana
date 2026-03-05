/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AuthMode, ConnectorSpec } from '@kbn/connector-specs';
import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';

export const generateSchema = (
  spec: ConnectorSpec,
  {
    authorizationCodeEnabled,
    authMode,
  }: { authorizationCodeEnabled?: boolean; authMode?: AuthMode } = {
    authorizationCodeEnabled: false,
  }
) => {
  return z.object({
    config: spec.schema ?? z.object({}),
    secrets: generateSecretsSchemaFromSpec(spec.auth, { authorizationCodeEnabled, authMode }),
    authMode: z
      .preprocess(
        // if the authMode is an empty string, set it to undefined
        (val) => (val === '' ? undefined : val),
        z.enum(['shared', 'per-user']).optional()
      )
      .meta({ hidden: true }),
  });
};
