/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Resolver } from 'react-hook-form';
import { getToolTypeConfig } from '../../components/tools/form/registry/tools_form_registry';
import type { ToolFormData } from '../../components/tools/form/types/tool_form_types';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import type { ToolTypeRegistryEntry } from '../../components/tools/form/registry/common';

export function useToolRegistryResolver(): Resolver<ToolFormData> {
  const services = useAgentBuilderServices();

  return useCallback(
    async (data, context, options) => {
      const config = getToolTypeConfig(data.type) as ToolTypeRegistryEntry<ToolFormData>;
      const resolver = config.getValidationResolver(services);
      return resolver(data, context, options);
    },
    [services]
  );
}
