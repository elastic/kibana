/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { IngestPipelinesPlugin } from './plugin';

export function plugin(context: PluginInitializerContext) {
  return new IngestPipelinesPlugin(context);
}

export { INGEST_PIPELINES_APP_LOCATOR, INGEST_PIPELINES_PAGES } from './locator';
export type { IngestPipelinesListParams } from './locator';
