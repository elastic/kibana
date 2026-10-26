/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const DEFAULT_CATALOG_URL = 'https://workflows.elastic.co/connectors/v1';
const MIN_REFRESH_INTERVAL_MS = 10_000;

export const catalogConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  url: schema.conditional(
    schema.contextRef('dev'),
    true,
    schema.uri({ scheme: ['https', 'http'], defaultValue: DEFAULT_CATALOG_URL }),
    schema.uri({ scheme: ['https'], defaultValue: DEFAULT_CATALOG_URL })
  ),
  refreshInterval: schema.duration({
    defaultValue: '5m',
    validate: (value) => {
      if (value.asMilliseconds() < MIN_REFRESH_INTERVAL_MS) {
        return 'refreshInterval must be at least 10 seconds';
      }
    },
  }),
});

export type CatalogConfig = TypeOf<typeof catalogConfigSchema>;
