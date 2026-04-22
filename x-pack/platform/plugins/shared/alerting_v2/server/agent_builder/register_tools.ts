/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { buildScopedRulesClientFactory } from './scoped_rules_client_factory';
import { createGetRuleTool } from './tools/read/get_rule_tool';
import { createFindRulesTool } from './tools/read/find_rules_tool';
import { createBulkGetRulesTool } from './tools/read/bulk_get_rules_tool';
import { createGetRuleTagsTool } from './tools/read/get_rule_tags_tool';
import { createCreateRuleTool } from './tools/write/create_rule_tool';
import { createUpdateRuleTool } from './tools/write/update_rule_tool';
import { createDeleteRuleTool } from './tools/write/delete_rule_tool';
import { createEnableRuleTool } from './tools/write/enable_rule_tool';
import { createDisableRuleTool } from './tools/write/disable_rule_tool';
import { createBulkDeleteRulesTool } from './tools/bulk/bulk_delete_rules_tool';
import { createBulkEnableRulesTool } from './tools/bulk/bulk_enable_rules_tool';
import { createBulkDisableRulesTool } from './tools/bulk/bulk_disable_rules_tool';

export function registerAlertingV2Tools({
  agentBuilder,
  getInjection,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getInjection: () => CoreDiServiceStart;
}): void {
  const getScopedRulesClient = buildScopedRulesClientFactory(getInjection);

  const tools = [
    // Read
    createGetRuleTool({ getScopedRulesClient }),
    createFindRulesTool({ getScopedRulesClient }),
    createBulkGetRulesTool({ getScopedRulesClient }),
    createGetRuleTagsTool({ getScopedRulesClient }),
    // Write
    createCreateRuleTool({ getScopedRulesClient }),
    createUpdateRuleTool({ getScopedRulesClient }),
    createDeleteRuleTool({ getScopedRulesClient }),
    createEnableRuleTool({ getScopedRulesClient }),
    createDisableRuleTool({ getScopedRulesClient }),
    // Bulk
    createBulkDeleteRulesTool({ getScopedRulesClient }),
    createBulkEnableRulesTool({ getScopedRulesClient }),
    createBulkDisableRulesTool({ getScopedRulesClient }),
  ];

  for (const tool of tools) {
    agentBuilder.tools.register(tool);
  }
}
