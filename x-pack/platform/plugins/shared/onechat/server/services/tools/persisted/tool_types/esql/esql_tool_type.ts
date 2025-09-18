/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { EsqlToolConfig } from '@kbn/onechat-common';
import type { PersistedToolTypeDefinition } from '../types';
import { toToolDefinition } from './to_tool_definition';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

export const createEsqlToolType = (): PersistedToolTypeDefinition<EsqlToolConfig> => {
  return {
    toolType: ToolType.esql,
    toToolDefinition,
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async (config) => {
      await validateConfig(config);
      return config;
    },
    validateForUpdate: async (update, current) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await validateConfig(mergedConfig);
      return mergedConfig;
    },
  };
};
