/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';

export const generateSchema = (spec: ConnectorSpec) => {
  return z.object({
    config: spec.schema ?? z.object({}),
    secrets: generateSecretsSchemaFromSpec(spec.auth),
  });
};
