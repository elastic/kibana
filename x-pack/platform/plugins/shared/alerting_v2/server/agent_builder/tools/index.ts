/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { ScopedServicesFactory } from '../scoped_services';
import { listRulesTool } from './list_rules_tool';
import { getRuleTool } from './get_rule_tool';
import { queryAlertEventsTool } from './query_alert_events_tool';
import { createRuleTool } from './create_rule_tool';
import { toggleRuleTool } from './toggle_rule_tool';
import { updateRuleTool } from './update_rule_tool';
import { bulkManageRulesTool } from './bulk_manage_rules_tool';
import { explainRuleQueryTool } from './explain_rule_query_tool';
import { validateEsqlQueryTool } from './validate_esql_query_tool';
import { listNotificationPoliciesTool } from './list_notification_policies_tool';
import { discoverDataSourcesTool } from './discover_data_sources_tool';
import { describeDataSourceTool } from './describe_data_source_tool';
import { proposeRuleTool } from './propose_rule_tool';

export const registerTools = ({
  agentBuilder,
  getScopedServices,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedServices: ScopedServicesFactory;
}) => {
  // P0 — core read tools
  agentBuilder.tools.register(listRulesTool(getScopedServices));
  agentBuilder.tools.register(getRuleTool(getScopedServices));
  agentBuilder.tools.register(queryAlertEventsTool());

  // P1 — mutating tools
  agentBuilder.tools.register(createRuleTool(getScopedServices));
  agentBuilder.tools.register(toggleRuleTool(getScopedServices));

  // P2 — advanced tools
  agentBuilder.tools.register(updateRuleTool(getScopedServices));
  agentBuilder.tools.register(bulkManageRulesTool(getScopedServices));
  agentBuilder.tools.register(explainRuleQueryTool(getScopedServices));
  agentBuilder.tools.register(validateEsqlQueryTool());

  // P3 — notification policies
  agentBuilder.tools.register(listNotificationPoliciesTool(getScopedServices));

  // P4 — data discovery & profiling
  agentBuilder.tools.register(discoverDataSourcesTool());
  agentBuilder.tools.register(describeDataSourceTool());

  // P5 — rule proposals
  agentBuilder.tools.register(proposeRuleTool());
};
