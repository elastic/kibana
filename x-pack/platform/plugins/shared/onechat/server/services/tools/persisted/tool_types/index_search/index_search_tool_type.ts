/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { IndexSearchToolConfig } from '@kbn/onechat-common/tools';
import type { PersistedToolTypeDefinition } from '../types';
import { toToolDefinition } from './to_tool_definition';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

export const createIndexSearchToolType = (): PersistedToolTypeDefinition<IndexSearchToolConfig> => {
  return {
    toolType: ToolType.index_search,
    toToolDefinition,
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async (config, { esClient }) => {
      await validateConfig({ config, esClient });
      return config;
    },
    validateForUpdate: async (update, current, { esClient }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await validateConfig({ config: mergedConfig, esClient });
      return mergedConfig;
    },
  };
};
