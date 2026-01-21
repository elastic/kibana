/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type { EsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql';
import { ESQL_CONFIG_SCHEMA_VERSION } from '@kbn/agent-builder-common/tools/types/esql';
import type { LegacyEsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql_legacy';
import {
  convertLegacyEsqlToolFieldType,
  convertLegacyEsqlToolParamDefaultValue,
  isLegacyEsqlToolConfig,
} from '@kbn/agent-builder-common/tools/types/esql_legacy';
import type { ToolTypeDefinition } from '../definitions';
import { createHandler } from './create_handler';
import { createSchemaFromParams } from './create_schema';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

const convertConfigFromPersistence = (
  rawConfig: EsqlToolConfig | LegacyEsqlToolConfig
): EsqlToolConfig => {
  if (!isLegacyEsqlToolConfig(rawConfig)) {
    return rawConfig;
  }

  const params = Object.entries(rawConfig.params).reduce((acc, [paramName, rawParam]) => {
    const type = convertLegacyEsqlToolFieldType(rawParam.type);
    const defaultValue = convertLegacyEsqlToolParamDefaultValue(
      rawParam.type,
      rawParam.defaultValue
    );

    const nextParam: EsqlToolConfig['params'][string] = {
      ...rawParam,
      type,
      defaultValue,
    };

    acc[paramName] = nextParam;
    return acc;
  }, {} as EsqlToolConfig['params']);

  return { schema_version: ESQL_CONFIG_SCHEMA_VERSION, query: rawConfig.query, params };
};

export const getEsqlToolType = (): ToolTypeDefinition<
  ToolType.esql,
  EsqlToolConfig,
  ZodObject<any>,
  EsqlToolConfig | LegacyEsqlToolConfig
> => {
  return {
    toolType: ToolType.esql,
    convertFromPersistence: (config) => convertConfigFromPersistence(config),
    getDynamicProps: (config) => {
      return {
        getHandler: () => createHandler(config),
        getSchema: () => createSchemaFromParams(config.params),
      };
    },

    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config }) => {
      const nextConfig: EsqlToolConfig = { ...config, schema_version: ESQL_CONFIG_SCHEMA_VERSION };
      await validateConfig(nextConfig);
      return nextConfig;
    },
    validateForUpdate: async ({ update, current }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      const nextConfig: EsqlToolConfig = {
        ...mergedConfig,
        schema_version: ESQL_CONFIG_SCHEMA_VERSION,
      };
      await validateConfig(nextConfig);
      return nextConfig;
    },
  };
};
