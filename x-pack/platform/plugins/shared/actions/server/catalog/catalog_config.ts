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
  url: schema.uri({
    scheme: ['http', 'https'],
    defaultValue: DEFAULT_CATALOG_URL,
  }),
  localBundlePath: schema.maybe(schema.string({ minLength: 1, maxLength: 4096 })),
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

export const assertCatalogUrlAllowed = (url: string, isDev: boolean): void => {
  const parsed = new URL(url);
  if (parsed.protocol === 'http:' && !isDev) {
    throw new Error('xpack.actions.catalog.url must use https outside of development mode');
  }
};
