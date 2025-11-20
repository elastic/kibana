/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolTypeDefinition } from '../tool_types';
import type { InternalToolDefinition } from '../tool_provider';
import type { ToolPersistedDefinition } from './client';
import type { ToolTypeConversionContext } from '../tool_types/definitions';

export const convertPersistedDefinition = ({
  tool,
  definition,
  context,
}: {
  tool: ToolPersistedDefinition;
  definition: ToolTypeDefinition;
  context: ToolTypeConversionContext;
}): InternalToolDefinition => {
  const { id, type, description, tags, configuration } = tool;
  const { request, spaceId } = context;

  const getDynamicProps = () => {
    return definition.getDynamicProps(configuration, { request, spaceId });
  };

  return {
    id,
    type,
    description,
    tags,
    configuration,
    readonly: false,
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
