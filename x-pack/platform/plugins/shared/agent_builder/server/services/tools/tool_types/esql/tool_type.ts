/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { EsqlToolConfig } from '@kbn/onechat-common/tools/types/esql';
import type { ToolTypeDefinition } from '../definitions';
import { createHandler } from './create_handler';
import { createSchemaFromParams } from './create_schema';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

export const getEsqlToolType = (): ToolTypeDefinition<
  ToolType.esql,
  EsqlToolConfig,
  ZodObject<any>
> => {
  return {
    toolType: ToolType.esql,
    getDynamicProps: (config) => {
      return {
        getHandler: () => createHandler(config),
        getSchema: () => createSchemaFromParams(config.params),
      };
    },

    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config }) => {
      await validateConfig(config);
      return config;
    },
    validateForUpdate: async ({ update, current }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await validateConfig(mergedConfig);
      return mergedConfig;
    },
  };
};
