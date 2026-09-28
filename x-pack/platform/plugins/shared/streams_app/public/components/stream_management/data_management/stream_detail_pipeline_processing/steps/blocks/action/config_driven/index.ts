/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendProcessorConfig } from './configs/append';
import { renameProcessorConfig } from './configs/rename';
import { removeProcessorConfig } from './configs/remove';
import { uriPartsProcessorConfig } from './configs/uri_parts';

// `remove_by_prefix` is intentionally parked in `configs/remove_by_prefix.tsx`
// but not registered until ingest pipelines support an equivalent native processor.
export const configDrivenProcessors = {
  rename: renameProcessorConfig,
  append: appendProcessorConfig,
  remove: removeProcessorConfig,
  uri_parts: uriPartsProcessorConfig,
};
