/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { StreamsConfig } from '../common/config';
import { configSchema, exposeToBrowserConfig } from '../common/config';

export const config: PluginConfigDescriptor<StreamsConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};
