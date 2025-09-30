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

export const getEsqlToolType = (): ToolTypeDefinition<
  ToolType.esql,
  EsqlToolConfig,
  ZodObject<any>
> => {
  return {
    type: ToolType.esql,
    getGeneratedProps: (config) => {
      return {
        handler: createHandler(),
        getSchema: () => createSchemaFromParams(config.params),
      };
    },
  };
};
