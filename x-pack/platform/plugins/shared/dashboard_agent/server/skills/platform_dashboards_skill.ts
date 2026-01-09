/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const maybeConfig = config as {
    configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
  };

  return maybeConfig.configurable?.onechat ?? null;
};

const PLATFORM_DASHBOARDS_TOOL = tool(
  async (input, config) => {
    const onechat = getOneChatContext(config);
    if (!onechat) {
      throw new Error('OneChat context not available');
    }

    const asAny = input as any;
    const { operation, params, ...rest } = asAny ?? {};

    const toolId =
      operation === 'create'
        ? 'platform.dashboard.create_dashboard'
        : 'platform.dashboard.update_dashboard';

    const available = await onechat.toolProvider.has({ toolId, request: onechat.request });
    if (!available) {
      return JSON.stringify({
        error: {
          message: `Tool "${toolId}" not found. It may be disabled, not registered, or unavailable in this deployment.`,
        },
        toolId,
      });
    }

    const result = await onechat.runner.runTool({
      toolId,
      toolParams: ((params ?? rest) ?? {}) as Record<string, unknown>,
    });

    return JSON.stringify(result);
  },
  {
    name: 'platform.dashboards',
    description:
      'Single entrypoint for dashboard creation and updates. Routes to the dashboard tools based on `operation`.',
    schema: z.discriminatedUnion('operation', [
      z
        .object({
          operation: z.literal('create').describe('Create a new dashboard.'),
          params: z.object({}).passthrough().optional(),
        })
        .passthrough(),
      z
        .object({
          operation: z.literal('update').describe('Update an existing dashboard.'),
          params: z.object({}).passthrough().optional(),
        })
        .passthrough(),
    ]),
  }
);

export const PLATFORM_DASHBOARD_SKILL: Skill = {
  namespace: 'platform.dashboards',
  name: 'Platform Dashboards',
  description: 'Create and update dashboards safely',
  content: `# Platform Dashboards

## What this skill does
Helps you create and update dashboards in a non-destructive way, focusing on incremental changes and clear user intent.

## When to use
- The user needs a new dashboard for a purpose/team.
- The user wants to add panels/filters/time settings to an existing dashboard.

## Inputs to ask the user for
- **Dashboard name/title**
- **Data sources** (data view/index pattern)
- **Panels desired** (visualization type + fields + breakdowns)
- **Time range / filters** to apply by default

## Safe workflow
1) Clarify the intended audience and key questions the dashboard should answer.\n
2) Propose panel layout (few panels first).\n
3) If applying changes, summarize exactly what will be created/updated.\n
4) Prefer saved-object versioned updates when writing.\n
`,
  tools: [PLATFORM_DASHBOARDS_TOOL],
};


