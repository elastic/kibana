/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '../../../../../rules_client';

export interface CreateRuleToolArgs {
  name: string;
  rule_type_id: string;
  consumer: string;
  schedule_interval: string;
  params: string;
  tags?: string;
}

export const createRuleTool = async (args: CreateRuleToolArgs, rulesClient: RulesClient) => {
  let parsedParams: Record<string, unknown>;
  try {
    parsedParams = JSON.parse(args.params);
  } catch {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: 'Invalid JSON in params field' }),
        },
      ],
      isError: true,
    };
  }

  try {
    const createdRule = await rulesClient.create({
      data: {
        name: args.name,
        alertTypeId: args.rule_type_id,
        enabled: true,
        consumer: args.consumer,
        tags: args.tags
          ? args.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        params: parsedParams,
        schedule: { interval: args.schedule_interval },
        actions: [],
        systemActions: [],
      },
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(createdRule, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: String(err) }),
        },
      ],
      isError: true,
    };
  }
};
