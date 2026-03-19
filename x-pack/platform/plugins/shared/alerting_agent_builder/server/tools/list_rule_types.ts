/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core/server';
import type { PluginStartDependencies } from '../types';

export const ALERTING_LIST_RULE_TYPES_TOOL_ID = 'alerting.list_rule_types';

const listRuleTypesSchema = z.object({});

export function createListRuleTypesTool(
  core: CoreSetup<PluginStartDependencies>
): StaticToolRegistration<typeof listRuleTypesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof listRuleTypesSchema> = {
    id: ALERTING_LIST_RULE_TYPES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'List all available alerting rule types with their IDs, names, producers, and license requirements. Call this first to discover what rules can be created.',
    schema: listRuleTypesSchema,
    tags: ['alerting', 'rules'],
    handler: async (_toolParams, _context) => {
      const [, { alerting }] = await core.getStartServices();
      const types = Array.from(alerting.listTypes().values()).map(
        ({ id, name, producer, enabledInLicense, minimumLicenseRequired, category }) => ({
          id,
          name,
          producer,
          category,
          enabledInLicense,
          minimumLicenseRequired,
        })
      );

      return {
        results: [{ type: ToolResultType.other, data: { types } }],
      };
    },
  };

  return toolDefinition;
}
