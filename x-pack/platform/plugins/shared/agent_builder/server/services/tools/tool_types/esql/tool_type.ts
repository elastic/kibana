/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ESQL_CONFIG_SCHEMA_VERSION } from '@kbn/agent-builder-common/tools/types/esql';
import type { EsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql';

import {
  convertLegacyEsqlToolFieldType,
  convertLegacyEsqlToolParamDefaultValue,
  isLegacyEsqlToolConfig,
  type EsqlToolPersistedConfig,
} from './esql_legacy';
import type { ToolTypeDefinition } from '../definitions';
import { createHandler } from './create_handler';
import { createSchemaFromParams } from './create_schema';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

const convertConfigFromPersistence = (rawConfig: EsqlToolPersistedConfig): EsqlToolConfig => {
  if (!isLegacyEsqlToolConfig(rawConfig)) {
    // Never propagate schema_version to outside the persistence layer.
    const { schema_version: _, ...config } = rawConfig;
    return config;
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

  return { query: rawConfig.query, params };
};

export const getEsqlToolType = (): ToolTypeDefinition<
  ToolType.esql,
  EsqlToolConfig,
  ZodObject<any>,
  EsqlToolPersistedConfig
> => {
  return {
    toolType: ToolType.esql,
    convertFromPersistence: (config) => convertConfigFromPersistence(config),
    convertToPersistence: (config) => {
      return {
        ...config,
        schema_version: ESQL_CONFIG_SCHEMA_VERSION,
      };
    },
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
