/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';

export const generateSchema = (spec: ConnectorSpec) => {
  const config = spec.schema ?? z4.object({});
  const secrets = z4.object({
    secrets: generateSecretsSchemaFromSpec(spec.authTypes),
  });

  return z4.object({
    ...config.shape,
    ...secrets.shape,
  });
};
