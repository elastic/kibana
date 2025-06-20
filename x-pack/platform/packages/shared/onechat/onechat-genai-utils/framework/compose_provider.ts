/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { PlainIdToolIdentifier, ToolProviderId, ToolDescriptor } from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';

export interface ByToolIdRule {
  type: 'by_tool_id';
  providerId: ToolProviderId;
  toolIds: PlainIdToolIdentifier[];
}

export interface ByProviderIdRule {
  type: 'by_provider_id';
  providerId: ToolProviderId;
}

export type ToolFilterRule = ByToolIdRule | ByProviderIdRule;

const matches = (rule: ToolFilterRule, tool: ToolDescriptor): boolean => {
  if (rule.type === 'by_tool_id') {
    return tool.meta.providerId === rule.providerId && rule.toolIds.includes(tool.id);
  } else if (rule.type === 'by_provider_id') {
    return tool.meta.providerId === rule.providerId;
  } else {
    throw new Error('Unknown rule type');
  }
};

const anyMatch = (rules: ToolFilterRule[], tool: ToolDescriptor): boolean => {
  return rules.some((rule) => matches(rule, tool));
};

export const filterProviderTools = async ({
  provider,
  rules,
  request,
}: {
  provider: ToolProvider;
  rules: ToolFilterRule[];
  request: KibanaRequest;
}): Promise<ExecutableTool[]> => {
  const tools = await provider.list({ request });
  return tools.filter((tool) => anyMatch(rules, tool));
};
