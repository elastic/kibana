/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ToolType } from '@kbn/onechat-common';
import type { Resolver } from 'react-hook-form';
import { getToolTypeConfig } from '../../components/tools/form/tools_form_registry';
import { useOnechatServices } from '../use_onechat_service';
import type { ToolFormData } from '../../components/tools/form/types/tool_form_types';

export function useToolRegistryResolver(toolType: ToolType): Resolver<ToolFormData> {
  const services = useOnechatServices();

  return useCallback(
    async (data, context, options) => {
      const currentType = data.type || toolType;
      const toolTypeConfig = getToolTypeConfig(currentType);
      if (!toolTypeConfig) throw new Error(`Unknown tool type: ${currentType}`);

      const { getValidationResolver } = toolTypeConfig;
      // @ts-expect-error TS2345 - Union type ToolFormData cannot be narrowed to specific resolver type at compile time
      return getValidationResolver(services)(data, context, options);
    },
    [toolType, services]
  );
}
