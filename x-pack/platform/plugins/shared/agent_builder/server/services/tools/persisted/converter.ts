/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/agent-builder-common';
import type { InternalToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ZodObject } from '@kbn/zod';
import type { ToolTypeDefinition } from '../tool_types';
import type { ToolTypeConversionContext } from '../tool_types/definitions';
import type { ToolPersistedDefinition } from './client';

export const convertPersistedDefinition = <
  TType extends ToolType,
  TConfig extends object,
  TPersistedConfig extends object = TConfig,
  TSchema extends ZodObject<any> = ZodObject<any>
>({
  tool,
  definition,
  context,
}: {
  tool: ToolPersistedDefinition<TPersistedConfig> & { type: TType };
  definition: ToolTypeDefinition<TType, TConfig, TSchema, TPersistedConfig>;
  context: ToolTypeConversionContext;
}): InternalToolDefinition<TType, TConfig, TSchema> => {
  const { id, type, description, tags, configuration } = tool;
  const { request, spaceId } = context;

  const convertedConfiguration = definition.convertFromPersistence
    ? definition.convertFromPersistence(configuration, context)
    : (configuration as unknown as TConfig); // Force the type to be a runtime config because it doesn't need to be converted

  const getDynamicProps = () => {
    return definition.getDynamicProps(convertedConfiguration, { request, spaceId });
  };

  return {
    id,
    type,
    description,
    tags,
    configuration: convertedConfiguration,
    readonly: false,
    confirmation: {
      askUser: 'never',
    },
    isAvailable: () => {
      // persisted tools are always available atm (space check is done via the persistence client)
      return { status: 'available' };
    },
    getSchema: async () => {
      const props = await getDynamicProps();
      return props.getSchema();
    },
    getHandler: async () => {
      const props = await getDynamicProps();
      return props.getHandler();
    },
    getLlmDescription: async (args) => {
      const props = await getDynamicProps();
      return props.getLlmDescription ? props.getLlmDescription(args) : description;
    },
  };
};
