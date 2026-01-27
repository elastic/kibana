/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const findSchema = z.object({
  search: z.string().optional().describe('Optional search text'),
  perPage: z.number().int().min(1).max(200).optional().default(50),
  page: z.number().int().min(1).optional().default(1),
});

const getSchema = z.object({
  id: z.string().describe('Rule id'),
});

const setEnabledSchema = z.object({
  id: z.string().describe('Rule id'),
  enabled: z.boolean().describe('Whether the rule should be enabled'),
  confirm: z
    .literal(true)
    .describe('Required for enable/disable. Set to true only if the user explicitly confirmed.'),
});

const listTypesSchema = z.object({
  filter: z.string().optional().describe('Optional filter text to search rule types by name or id'),
});

const actionSchema = z.object({
  group: z.string().describe('Action group (e.g., "default" for when rule fires)'),
  id: z.string().describe('Connector id to execute'),
  params: z.record(z.any()).describe('Action-specific parameters'),
  frequency: z
    .object({
      summary: z.boolean().describe('Whether to send summary of alerts'),
      notifyWhen: z
        .enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval'])
        .describe('When to notify'),
      throttle: z.string().nullable().describe('Throttle interval (e.g., "1h")'),
    })
    .optional()
    .describe('Action frequency configuration'),
});

const createSchema = z.object({
  name: z.string().describe('Rule name'),
  alertTypeId: z
    .string()
    .describe('Rule type id (use list_types operation to see available types)'),
  consumer: z
    .string()
    .describe(
      'Consumer application (e.g., "alerts", "infrastructure", "logs", "siem", "uptime", "apm", "stackAlerts")'
    ),
  schedule: z.object({
    interval: z.string().describe('Check interval (e.g., "1m", "5m", "1h")'),
  }),
  params: z
    .record(z.any())
    .describe('Rule-type-specific parameters (schema varies by alertTypeId)'),
  enabled: z.boolean().optional().default(true).describe('Whether the rule should be enabled'),
  tags: z.array(z.string()).optional().default([]).describe('Tags for the rule'),
  actions: z
    .array(actionSchema)
    .optional()
    .default([])
    .describe('Actions to execute when rule fires'),
  notifyWhen: z
    .enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval'])
    .optional()
    .describe('When to run actions'),
  throttle: z.string().optional().nullable().describe('Global throttle interval (e.g., "1h")'),
  confirm: z
    .literal(true)
    .describe('Required to create a rule. Set to true only if the user explicitly confirmed.'),
});

const schema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('find'), params: findSchema }),
  z.object({ operation: z.literal('get'), params: getSchema }),
  z.object({ operation: z.literal('set_enabled'), params: setEnabledSchema }),
  z.object({ operation: z.literal('list_types'), params: listTypesSchema }),
  z.object({ operation: z.literal('create'), params: createSchema }),
]);

export const alertingRulesTool = ({
  coreSetup,
}: {
  coreSetup: any;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: platformCoreTools.alertingRules,
    type: ToolType.builtin,
    description:
      'Manage alerting rules: find, get, create, enable/disable, and list available rule types.',
    schema,
    handler: async (input, { request }) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const rulesClient = await pluginsStart.alerting?.getRulesClientWithRequest(request);
      if (!rulesClient) {
        return {
          results: [{ type: 'error', data: { message: 'alerting plugin not available' } }],
        };
      }

      switch (input.operation) {
        case 'find': {
          const res = await rulesClient.find({
            search: input.params.search,
            perPage: input.params.perPage,
            page: input.params.page,
          });
          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'find',
                  items: res.data,
                  total: res.total,
                  page: res.page,
                  perPage: res.perPage,
                },
              },
            ],
          };
        }
        case 'get': {
          const res = await rulesClient.get({ id: input.params.id });
          return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
        }
        case 'set_enabled': {
          if (input.params.enabled) {
            await rulesClient.enableRule({ id: input.params.id });
          } else {
            await rulesClient.disableRule({ id: input.params.id });
          }
          const res = await rulesClient.get({ id: input.params.id });
          return { results: [{ type: 'other', data: { operation: 'set_enabled', item: res } }] };
        }
        case 'list_types': {
          const ruleTypes = await rulesClient.listRuleTypes();
          let filteredTypes = ruleTypes;

          if (input.params.filter) {
            const filterLower = input.params.filter.toLowerCase();
            filteredTypes = ruleTypes.filter(
              (rt: { id: string; name: string }) =>
                rt.id.toLowerCase().includes(filterLower) ||
                rt.name.toLowerCase().includes(filterLower)
            );
          }

          // Return simplified rule type info for better readability
          const items = filteredTypes.map(
            (rt: {
              id: string;
              name: string;
              actionGroups: Array<{ id: string; name: string }>;
              defaultActionGroupId: string;
              authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
              producer: string;
            }) => ({
              id: rt.id,
              name: rt.name,
              actionGroups: rt.actionGroups,
              defaultActionGroupId: rt.defaultActionGroupId,
              authorizedConsumers: Object.keys(rt.authorizedConsumers),
              producer: rt.producer,
            })
          );

          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'list_types',
                  items,
                  total: items.length,
                },
              },
            ],
          };
        }
        case 'create': {
          const { confirm, ...ruleData } = input.params;
          const res = await rulesClient.create({
            data: {
              name: ruleData.name,
              alertTypeId: ruleData.alertTypeId,
              consumer: ruleData.consumer,
              schedule: ruleData.schedule,
              params: ruleData.params,
              enabled: ruleData.enabled ?? true,
              tags: ruleData.tags ?? [],
              actions: ruleData.actions ?? [],
              notifyWhen: ruleData.notifyWhen,
              throttle: ruleData.throttle,
            },
          });
          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'create',
                  item: res,
                  message: `Successfully created rule "${res.name}" with id ${res.id}`,
                },
              },
            ],
          };
        }
      }
    },
    tags: [],
  };
};
