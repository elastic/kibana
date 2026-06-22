/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { esApiRegistry } from '@kbn/elastic-clients-sdk';
import type { ApiRegistry } from '@kbn/elastic-clients-sdk';

export type ApiTarget = 'elasticsearch';

export const API_REGISTRIES: Record<ApiTarget, ApiRegistry> = {
  elasticsearch: esApiRegistry,
};

export const targetSchema = z
  .enum(['elasticsearch'])
  .default('elasticsearch')
  .describe(
    'The backend API target. Use "elasticsearch" to call Elasticsearch HTTP APIs. ' +
      'Defaults to "elasticsearch".'
  );
