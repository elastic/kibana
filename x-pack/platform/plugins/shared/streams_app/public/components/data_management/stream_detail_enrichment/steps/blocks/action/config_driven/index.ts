/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendProcessorConfig } from './configs/append';
import { renameProcessorConfig } from './configs/rename';
import { removeByPrefixProcessorConfig } from './configs/remove_by_prefix';
import { removeProcessorConfig } from './configs/remove';
import { geoipProcessorConfig } from './configs/geoip';

export const configDrivenProcessors = {
  rename: renameProcessorConfig,
  append: appendProcessorConfig,
  remove_by_prefix: removeByPrefixProcessorConfig,
  remove: removeProcessorConfig,
  geoip: geoipProcessorConfig,
};
